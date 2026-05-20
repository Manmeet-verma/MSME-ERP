import { Router } from "express";
import {
  db,
  socialAccountsTable,
  socialPostsTable,
  socialPostResultsTable,
  SOCIAL_PLATFORMS,
  type SocialPlatform,
} from "@workspace/db";
import { and, eq, desc, gte, lte } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";
import { aiDraftSocialPost, aiRewriteTone } from "../lib/ai";

const socialRouter = Router();

function fmtAccount(a: typeof socialAccountsTable.$inferSelect) {
  return {
    id: a.id,
    platform: a.platform,
    externalId: a.externalId,
    accountName: a.accountName,
    status: a.status,
    expiresAt: a.expiresAt?.toISOString() ?? null,
    metadata: a.metadata ?? {},
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

function fmtPost(p: typeof socialPostsTable.$inferSelect, results: (typeof socialPostResultsTable.$inferSelect)[] = []) {
  return {
    id: p.id,
    content: p.content,
    mediaUrls: p.mediaUrls ?? [],
    platforms: p.platforms ?? [],
    variants: p.variants ?? {},
    status: p.status,
    scheduledAt: p.scheduledAt?.toISOString() ?? null,
    publishedAt: p.publishedAt?.toISOString() ?? null,
    context: p.context ?? {},
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    results: results.map((r) => ({
      id: r.id,
      platform: r.platform,
      status: r.status,
      externalId: r.externalId ?? null,
      externalUrl: r.externalUrl ?? null,
      error: r.error ?? null,
      publishedAt: r.publishedAt?.toISOString() ?? null,
      metrics: r.metrics ?? {},
    })),
  };
}

// ── Accounts ──
socialRouter.get("/social/accounts", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const rows = await db.select().from(socialAccountsTable).where(eq(socialAccountsTable.organizationId, orgId));
  res.json(rows.map(fmtAccount));
});

socialRouter.post("/social/accounts", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const { platform, externalId, accountName, accessToken, refreshToken, expiresAt, metadata } = req.body ?? {};
  if (!platform || !SOCIAL_PLATFORMS.includes(platform) || !externalId || !accountName || !accessToken) {
    res.status(400).json({ error: "platform, externalId, accountName, accessToken required" });
    return;
  }
  const [existing] = await db
    .select()
    .from(socialAccountsTable)
    .where(
      and(
        eq(socialAccountsTable.organizationId, orgId),
        eq(socialAccountsTable.platform, platform),
        eq(socialAccountsTable.externalId, externalId),
      ),
    );
  let row;
  if (existing) {
    [row] = await db
      .update(socialAccountsTable)
      .set({
        accountName,
        accessToken,
        refreshToken: refreshToken ?? null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        status: "active",
        metadata: metadata ?? {},
        updatedAt: new Date(),
      })
      .where(eq(socialAccountsTable.id, existing.id))
      .returning();
  } else {
    [row] = await db
      .insert(socialAccountsTable)
      .values({
        organizationId: orgId,
        platform,
        externalId,
        accountName,
        accessToken,
        refreshToken: refreshToken ?? null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        status: "active",
        metadata: metadata ?? {},
      })
      .returning();
  }
  await logAction(req, "CONNECT", "social_account", row.id, `Platform ${platform}`);
  res.status(201).json(fmtAccount(row));
});

// ── OAuth ──
// State store keyed by short random token → { orgId, platform, userId, createdAt }
const oauthStates = new Map<string, { orgId: number; platform: SocialPlatform; userId: number; createdAt: number }>();
function newStateToken() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function purgeOldStates() {
  const cutoff = Date.now() - 10 * 60_000;
  for (const [k, v] of oauthStates) if (v.createdAt < cutoff) oauthStates.delete(k);
}
function oauthConfig(platform: SocialPlatform) {
  const base = process.env.PUBLIC_APP_URL || (process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}` : "");
  const redirectUri = `${base}/api/social/oauth/${platform}/callback`;
  if (platform === "facebook" || platform === "instagram") {
    return {
      clientId: process.env.META_APP_ID,
      clientSecret: process.env.META_APP_SECRET,
      redirectUri,
      authorizeUrl: "https://www.facebook.com/v19.0/dialog/oauth",
      tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
      scope: platform === "facebook"
        ? "pages_show_list,pages_manage_posts,pages_read_engagement"
        : "instagram_basic,instagram_content_publish,pages_show_list",
    };
  }
  return {
    clientId: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    redirectUri,
    authorizeUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    scope: "openid profile email w_member_social r_organization_social w_organization_social rw_organization_admin",
  };
}

socialRouter.get("/social/oauth/config", requireAuth, (_req, res) => {
  res.json({
    facebook: !!process.env.META_APP_ID && !!process.env.META_APP_SECRET,
    instagram: !!process.env.META_APP_ID && !!process.env.META_APP_SECRET,
    linkedin: !!process.env.LINKEDIN_CLIENT_ID && !!process.env.LINKEDIN_CLIENT_SECRET,
  });
});

socialRouter.get("/social/oauth/:platform/start", requireAuth, (req, res) => {
  purgeOldStates();
  const platform = req.params.platform as SocialPlatform;
  if (!(SOCIAL_PLATFORMS as readonly string[]).includes(platform)) {
    res.status(400).json({ error: "Unknown platform" });
    return;
  }
  const cfg = oauthConfig(platform);
  if (!cfg.clientId || !cfg.clientSecret) {
    res.status(400).json({ error: `OAuth not configured for ${platform}. Set ${platform === "linkedin" ? "LINKEDIN_CLIENT_ID/SECRET" : "META_APP_ID/SECRET"} env vars.` });
    return;
  }
  const state = newStateToken();
  oauthStates.set(state, { orgId: req.user!.organizationId, platform, userId: req.user!.userId, createdAt: Date.now() });
  const url = new URL(cfg.authorizeUrl);
  url.searchParams.set("client_id", cfg.clientId);
  url.searchParams.set("redirect_uri", cfg.redirectUri);
  url.searchParams.set("scope", cfg.scope);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  res.json({ authorizeUrl: url.toString() });
});

socialRouter.get("/social/oauth/:platform/callback", async (req, res) => {
  purgeOldStates();
  const platform = req.params.platform as SocialPlatform;
  const code = String(req.query.code ?? "");
  const stateToken = String(req.query.state ?? "");
  const stateEntry = oauthStates.get(stateToken);
  if (!stateEntry || stateEntry.platform !== platform) {
    res.status(400).send("Invalid or expired OAuth state. Please retry the connection from Settings → Integrations.");
    return;
  }
  oauthStates.delete(stateToken);
  const cfg = oauthConfig(platform);
  if (!cfg.clientId || !cfg.clientSecret) {
    res.status(400).send("OAuth not configured.");
    return;
  }
  try {
    // Exchange code → access token
    const body = new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uri: cfg.redirectUri,
      code,
      grant_type: "authorization_code",
    });
    const tokenResp = await fetch(cfg.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!tokenResp.ok) {
      const txt = await tokenResp.text().catch(() => "");
      res.status(502).send(`Token exchange failed: ${txt.slice(0, 500)}`);
      return;
    }
    const tokenData = (await tokenResp.json()) as { access_token?: string; expires_in?: number; refresh_token?: string };
    if (!tokenData.access_token) {
      res.status(502).send("No access_token in OAuth response.");
      return;
    }
    let accessToken = tokenData.access_token;
    let externalId = "";
    let accountName = "";
    let expiresAt = tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null;
    const metadata: Record<string, unknown> = { connectedVia: "oauth" };

    if (platform === "facebook" || platform === "instagram") {
      // Step 1: Exchange short-lived user token for a long-lived one (~60 days).
      try {
        const llParams = new URLSearchParams({
          grant_type: "fb_exchange_token",
          client_id: cfg.clientId,
          client_secret: cfg.clientSecret,
          fb_exchange_token: accessToken,
        });
        const ll = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?${llParams.toString()}`);
        if (ll.ok) {
          const lld = (await ll.json()) as { access_token?: string; expires_in?: number };
          if (lld.access_token) accessToken = lld.access_token;
          if (lld.expires_in) expiresAt = new Date(Date.now() + lld.expires_in * 1000);
        }
      } catch { /* fall through with short-lived */ }
      // Step 2: Discover Pages; Page access tokens derived from long-lived user
      // tokens are themselves long-lived (effectively non-expiring for Pages).
      const pagesResp = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${encodeURIComponent(accessToken)}&fields=id,name,access_token,instagram_business_account`);
      const pagesData = (await pagesResp.json()) as { data?: Array<{ id: string; name: string; access_token: string; instagram_business_account?: { id: string } }> };
      const page = pagesData.data?.[0];
      if (!page) {
        res.status(400).send("No Facebook Pages found on this account. Create or get admin access to a Page first.");
        return;
      }
      accessToken = page.access_token; // page access token (long-lived)
      metadata.fbPageId = page.id;
      metadata.fbPageName = page.name;
      if (platform === "facebook") {
        externalId = page.id;
        accountName = page.name;
      } else {
        if (!page.instagram_business_account?.id) {
          res.status(400).send("No Instagram Business account linked to your Facebook Page. Link one in Meta Business Suite first.");
          return;
        }
        externalId = page.instagram_business_account.id;
        accountName = `${page.name} (IG)`;
      }
    } else {
      // LinkedIn Page connection. Use the OpenID profile only to get the human
      // who authorised the app, then resolve a Page (organization) the user
      // administers via /v2/organizationAcls.
      const meResp = await fetch("https://api.linkedin.com/v2/userinfo", { headers: { Authorization: `Bearer ${accessToken}` } });
      const me = (await meResp.json()) as { sub?: string; name?: string };
      const aclResp = await fetch(
        "https://api.linkedin.com/v2/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED&projection=(elements*(organization~(id,localizedName)))",
        { headers: { Authorization: `Bearer ${accessToken}`, "X-Restli-Protocol-Version": "2.0.0" } },
      );
      if (aclResp.ok) {
        const acl = (await aclResp.json()) as { elements?: Array<{ organization?: string; "organization~"?: { id?: number; localizedName?: string } }> };
        const first = acl.elements?.[0];
        if (first) {
          const orgUrn = first.organization || (first["organization~"]?.id ? `urn:li:organization:${first["organization~"]?.id}` : "");
          if (orgUrn) {
            externalId = orgUrn;
            accountName = first["organization~"]?.localizedName ?? "LinkedIn Page";
            metadata.linkedinAdminSub = me.sub;
          }
        }
      }
      if (!externalId) {
        // Fallback to personal profile when user isn't an org admin.
        if (!me.sub) {
          res.status(502).send("Could not load LinkedIn profile or any LinkedIn Pages.");
          return;
        }
        externalId = `urn:li:person:${me.sub}`;
        accountName = me.name ?? "LinkedIn personal profile";
        metadata.linkedinKind = "person";
      } else {
        metadata.linkedinKind = "organization";
      }
    }

    // Upsert account
    const [existing] = await db
      .select()
      .from(socialAccountsTable)
      .where(and(
        eq(socialAccountsTable.organizationId, stateEntry.orgId),
        eq(socialAccountsTable.platform, platform),
        eq(socialAccountsTable.externalId, externalId),
      ));
    if (existing) {
      await db.update(socialAccountsTable)
        .set({ accessToken, accountName, refreshToken: tokenData.refresh_token ?? null, expiresAt, status: "active", updatedAt: new Date() })
        .where(eq(socialAccountsTable.id, existing.id));
    } else {
      await db.insert(socialAccountsTable).values({
        organizationId: stateEntry.orgId,
        platform, externalId, accountName, accessToken,
        refreshToken: tokenData.refresh_token ?? null,
        expiresAt, status: "active", metadata,
      });
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`<!doctype html><html><body style="font-family:system-ui;padding:2rem;background:#050816;color:#fff"><h2>${platform} connected ✓</h2><p>You can close this window and return to MSME Pro.</p><script>window.opener&&window.opener.postMessage({type:"social-oauth-done",platform:"${platform}"},"*");setTimeout(()=>window.close(),500)</script></body></html>`);
  } catch (e) {
    res.status(502).send("OAuth callback failed: " + (e as Error).message);
  }
});

socialRouter.delete("/social/accounts/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  // Best-effort revocation at the provider, then delete locally.
  const [acct] = await db
    .select()
    .from(socialAccountsTable)
    .where(and(eq(socialAccountsTable.id, id), eq(socialAccountsTable.organizationId, orgId)));
  if (acct) {
    try {
      if (acct.platform === "facebook" || acct.platform === "instagram") {
        await fetch(
          `https://graph.facebook.com/v19.0/${encodeURIComponent(acct.externalId)}/permissions?access_token=${encodeURIComponent(acct.accessToken)}`,
          { method: "DELETE", signal: AbortSignal.timeout(8_000) },
        );
      } else if (acct.platform === "linkedin") {
        await fetch("https://www.linkedin.com/oauth/v2/revoke", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            token: acct.accessToken,
            client_id: process.env.LINKEDIN_CLIENT_ID ?? "",
            client_secret: process.env.LINKEDIN_CLIENT_SECRET ?? "",
          }),
          signal: AbortSignal.timeout(8_000),
        });
      }
    } catch (e) {
      req.log?.warn?.({ err: e }, "Provider revocation failed");
    }
  }
  await db
    .delete(socialAccountsTable)
    .where(and(eq(socialAccountsTable.id, id), eq(socialAccountsTable.organizationId, orgId)));
  await logAction(req, "DISCONNECT", "social_account", id);
  res.json({ message: "Account disconnected" });
});

// Refresh a single post's per-platform engagement metrics from each provider.
socialRouter.post("/social/posts/:id/refresh-metrics", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  const [post] = await db
    .select()
    .from(socialPostsTable)
    .where(and(eq(socialPostsTable.id, id), eq(socialPostsTable.organizationId, orgId)));
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  const results = await db.select().from(socialPostResultsTable).where(eq(socialPostResultsTable.postId, id));
  const accounts = await db.select().from(socialAccountsTable).where(eq(socialAccountsTable.organizationId, orgId));
  for (const r of results) {
    if (!r.externalId || r.status !== "posted") continue;
    const acct = accounts.find((a) => a.platform === r.platform);
    if (!acct) continue;
    try {
      let metrics: Record<string, number> = {};
      if (r.platform === "facebook") {
        const u = `https://graph.facebook.com/v19.0/${encodeURIComponent(r.externalId)}?fields=likes.summary(true),comments.summary(true),shares,reactions.summary(true)&access_token=${encodeURIComponent(acct.accessToken)}`;
        const fr = await fetch(u, { signal: AbortSignal.timeout(10_000) });
        if (fr.ok) {
          const d = (await fr.json()) as {
            likes?: { summary?: { total_count?: number } };
            comments?: { summary?: { total_count?: number } };
            shares?: { count?: number };
            reactions?: { summary?: { total_count?: number } };
          };
          metrics = {
            likes: d.likes?.summary?.total_count ?? 0,
            comments: d.comments?.summary?.total_count ?? 0,
            shares: d.shares?.count ?? 0,
            reactions: d.reactions?.summary?.total_count ?? 0,
          };
        }
      } else if (r.platform === "instagram") {
        const u = `https://graph.facebook.com/v19.0/${encodeURIComponent(r.externalId)}?fields=like_count,comments_count&access_token=${encodeURIComponent(acct.accessToken)}`;
        const fr = await fetch(u, { signal: AbortSignal.timeout(10_000) });
        if (fr.ok) {
          const d = (await fr.json()) as { like_count?: number; comments_count?: number };
          metrics = { likes: d.like_count ?? 0, comments: d.comments_count ?? 0 };
        }
        // Best-effort impressions/reach via insights
        const ins = await fetch(
          `https://graph.facebook.com/v19.0/${encodeURIComponent(r.externalId)}/insights?metric=impressions,reach&access_token=${encodeURIComponent(acct.accessToken)}`,
          { signal: AbortSignal.timeout(10_000) },
        );
        if (ins.ok) {
          const id2 = (await ins.json()) as { data?: Array<{ name?: string; values?: Array<{ value?: number }> }> };
          for (const m of id2.data ?? []) {
            if (m.name && m.values?.[0]?.value != null) metrics[m.name] = m.values[0].value;
          }
        }
      } else if (r.platform === "linkedin") {
        const urn = encodeURIComponent(r.externalId);
        const sa = await fetch(`https://api.linkedin.com/v2/socialActions/${urn}`, {
          headers: { Authorization: `Bearer ${acct.accessToken}`, "X-Restli-Protocol-Version": "2.0.0" },
          signal: AbortSignal.timeout(10_000),
        });
        if (sa.ok) {
          const d = (await sa.json()) as { likesSummary?: { totalLikes?: number }; commentsSummary?: { aggregatedTotalComments?: number } };
          metrics = {
            likes: d.likesSummary?.totalLikes ?? 0,
            comments: d.commentsSummary?.aggregatedTotalComments ?? 0,
          };
        }
      }
      await db.update(socialPostResultsTable).set({ metrics }).where(eq(socialPostResultsTable.id, r.id));
    } catch (e) {
      req.log?.warn?.({ err: e, platform: r.platform }, "Metrics fetch failed");
    }
  }
  const refreshed = await db.select().from(socialPostResultsTable).where(eq(socialPostResultsTable.postId, id));
  res.json(fmtPost(post, refreshed));
});

// ── Posts ──
socialRouter.get("/social/posts", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const from = req.query.from ? new Date(String(req.query.from)) : null;
  const to = req.query.to ? new Date(String(req.query.to)) : null;
  const filters = [eq(socialPostsTable.organizationId, orgId)];
  if (from) filters.push(gte(socialPostsTable.createdAt, from));
  if (to) filters.push(lte(socialPostsTable.createdAt, to));
  const rows = await db
    .select()
    .from(socialPostsTable)
    .where(and(...filters))
    .orderBy(desc(socialPostsTable.createdAt));
  const ids = rows.map((r) => r.id);
  const results = ids.length
    ? await db
        .select()
        .from(socialPostResultsTable)
        .where(eq(socialPostResultsTable.organizationId, orgId))
    : [];
  const resultsByPost = new Map<number, (typeof results)>();
  for (const r of results) {
    const arr = resultsByPost.get(r.postId) ?? [];
    arr.push(r);
    resultsByPost.set(r.postId, arr);
  }
  res.json(rows.map((r) => fmtPost(r, resultsByPost.get(r.id) ?? [])));
});

socialRouter.post("/social/posts", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const { content, platforms, variants, mediaUrls, scheduledAt, context, status } = req.body ?? {};
  if (!content || !Array.isArray(platforms) || platforms.length === 0) {
    res.status(400).json({ error: "content and at least one platform required" });
    return;
  }
  const validPlatforms = platforms.filter((p: string) => (SOCIAL_PLATFORMS as readonly string[]).includes(p));
  const [row] = await db
    .insert(socialPostsTable)
    .values({
      organizationId: orgId,
      content,
      mediaUrls: Array.isArray(mediaUrls) ? mediaUrls : [],
      platforms: validPlatforms as SocialPlatform[],
      variants: variants ?? {},
      status: status === "scheduled" || scheduledAt ? "scheduled" : "draft",
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      context: context ?? {},
      createdById: req.user!.userId,
    })
    .returning();
  await logAction(req, "CREATE", "social_post", row.id);
  res.status(201).json(fmtPost(row));
});

socialRouter.patch("/social/posts/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const f of ["content", "platforms", "variants", "mediaUrls", "context", "status"] as const) {
    if (req.body?.[f] !== undefined) updates[f] = req.body[f];
  }
  if (req.body?.scheduledAt !== undefined) {
    updates.scheduledAt = req.body.scheduledAt ? new Date(req.body.scheduledAt) : null;
    if (req.body.scheduledAt && !updates.status) updates.status = "scheduled";
  }
  const [row] = await db
    .update(socialPostsTable)
    .set(updates)
    .where(and(eq(socialPostsTable.id, id), eq(socialPostsTable.organizationId, orgId)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  res.json(fmtPost(row));
});

socialRouter.delete("/social/posts/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  await db
    .delete(socialPostsTable)
    .where(and(eq(socialPostsTable.id, id), eq(socialPostsTable.organizationId, orgId)));
  res.json({ message: "Post deleted" });
});

// AI draft
socialRouter.post("/social/posts/draft", requireAuth, async (req, res) => {
  const { prompt, platforms, tone, context } = req.body ?? {};
  if (!prompt || !Array.isArray(platforms) || platforms.length === 0) {
    res.status(400).json({ error: "prompt and platforms required" });
    return;
  }
  try {
    const drafted = await aiDraftSocialPost({
      prompt,
      platforms: platforms.filter((p: string) =>
        (SOCIAL_PLATFORMS as readonly string[]).includes(p),
      ) as SocialPlatform[],
      tone,
      context,
    });
    res.json(drafted);
  } catch (e) {
    res.status(502).json({ error: "AI draft failed: " + (e as Error).message });
  }
});

socialRouter.post("/social/posts/rewrite", requireAuth, async (req, res) => {
  const { text, tone } = req.body ?? {};
  if (!text || !tone) {
    res.status(400).json({ error: "text and tone required" });
    return;
  }
  try {
    const rewritten = await aiRewriteTone({ text, tone });
    res.json({ text: rewritten });
  } catch (e) {
    res.status(502).json({ error: "AI rewrite failed: " + (e as Error).message });
  }
});

// Publish now
async function publishToPlatform(
  platform: SocialPlatform,
  content: string,
  mediaUrls: string[],
  account: typeof socialAccountsTable.$inferSelect,
): Promise<{ ok: boolean; externalId?: string; externalUrl?: string; error?: string }> {
  // Best-effort live publish. If creds look like placeholders or the call fails,
  // we surface the error per-platform without crashing the worker.
  try {
    if (platform === "facebook") {
      // Facebook Page feed: optional `link` for first media URL.
      const payload: Record<string, unknown> = { message: content, access_token: account.accessToken };
      if (mediaUrls[0]) payload.link = mediaUrls[0];
      const r = await fetch(
        `https://graph.facebook.com/v19.0/${encodeURIComponent(account.externalId)}/feed`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(15_000),
        },
      );
      if (!r.ok) {
        const txt = await r.text().catch(() => `HTTP ${r.status}`);
        return { ok: false, error: txt.slice(0, 500) };
      }
      const data = (await r.json()) as { id?: string };
      const id = data.id ?? "";
      return { ok: true, externalId: id, externalUrl: id ? `https://facebook.com/${id}` : undefined };
    }
    if (platform === "instagram") {
      // Instagram Graph REQUIRES a public image_url (or video_url) to create a container.
      const imageUrl = mediaUrls.find((u) => /\.(jpe?g|png|webp)(\?|$)/i.test(u)) ?? mediaUrls[0];
      if (!imageUrl) {
        return { ok: false, error: "Instagram posts require at least one public image URL (jpg/png)." };
      }
      const containerParams = new URLSearchParams({
        image_url: imageUrl,
        caption: content,
        access_token: account.accessToken,
      });
      const c = await fetch(
        `https://graph.facebook.com/v19.0/${encodeURIComponent(account.externalId)}/media?${containerParams.toString()}`,
        { method: "POST", signal: AbortSignal.timeout(20_000) },
      );
      if (!c.ok) {
        const txt = await c.text().catch(() => `HTTP ${c.status}`);
        return { ok: false, error: txt.slice(0, 500) };
      }
      const cd = (await c.json()) as { id?: string };
      if (!cd.id) return { ok: false, error: "Instagram did not return a container id" };
      // Poll the container until status_code === 'FINISHED' (best effort, max ~10s)
      for (let i = 0; i < 5; i++) {
        const s = await fetch(
          `https://graph.facebook.com/v19.0/${encodeURIComponent(cd.id)}?fields=status_code&access_token=${encodeURIComponent(account.accessToken)}`,
        );
        if (s.ok) {
          const sd = (await s.json()) as { status_code?: string };
          if (sd.status_code === "FINISHED") break;
          if (sd.status_code === "ERROR" || sd.status_code === "EXPIRED") {
            return { ok: false, error: `Container status ${sd.status_code}` };
          }
        }
        await new Promise((r) => setTimeout(r, 2_000));
      }
      const publishParams = new URLSearchParams({ creation_id: cd.id, access_token: account.accessToken });
      const p = await fetch(
        `https://graph.facebook.com/v19.0/${encodeURIComponent(account.externalId)}/media_publish?${publishParams.toString()}`,
        { method: "POST", signal: AbortSignal.timeout(15_000) },
      );
      if (!p.ok) {
        const txt = await p.text().catch(() => `HTTP ${p.status}`);
        return { ok: false, error: txt.slice(0, 500) };
      }
      const pd = (await p.json()) as { id?: string };
      return { ok: true, externalId: pd.id ?? "" };
    }
    if (platform === "linkedin") {
      // LinkedIn UGC: author is `urn:li:person:{sub}` for personal posts (OpenID) or
      // `urn:li:organization:{id}` for Page posts. Our OAuth flow stores the URN sub
      // for personal accounts; org URNs are also supported via manual entry.
      const author = account.externalId.startsWith("urn:")
        ? account.externalId
        : account.externalId.match(/^[0-9]+$/)
          ? `urn:li:organization:${account.externalId}`
          : `urn:li:person:${account.externalId}`;
      const r = await fetch("https://api.linkedin.com/v2/ugcPosts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${account.accessToken}`,
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify({
          author,
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: { text: content },
              shareMediaCategory: "NONE",
            },
          },
          visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
        }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!r.ok) {
        const txt = await r.text().catch(() => `HTTP ${r.status}`);
        return { ok: false, error: txt.slice(0, 500) };
      }
      // LinkedIn returns the new post URN in the `x-restli-id` header (or `x-linkedin-id`)
      // and sometimes mirrors it in the JSON body. Prefer the header, fall back to JSON.
      const headerId = r.headers.get("x-restli-id") ?? r.headers.get("x-linkedin-id") ?? "";
      let bodyId = "";
      try {
        const j = (await r.json()) as { id?: string };
        bodyId = j.id ?? "";
      } catch { /* empty body is fine */ }
      const externalId = headerId || bodyId;
      const externalUrl = externalId ? `https://www.linkedin.com/feed/update/${encodeURIComponent(externalId)}` : undefined;
      return { ok: true, externalId, externalUrl };
    }
    return { ok: false, error: "Unknown platform" };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function publishPost(orgId: number, postId: number): Promise<void> {
  const [post] = await db
    .select()
    .from(socialPostsTable)
    .where(and(eq(socialPostsTable.id, postId), eq(socialPostsTable.organizationId, orgId)));
  if (!post) return;
  await db
    .update(socialPostsTable)
    .set({ status: "publishing", updatedAt: new Date() })
    .where(eq(socialPostsTable.id, postId));
  const accounts = await db
    .select()
    .from(socialAccountsTable)
    .where(and(eq(socialAccountsTable.organizationId, orgId), eq(socialAccountsTable.status, "active")));
  const results: { platform: SocialPlatform; ok: boolean; externalId?: string; externalUrl?: string; error?: string }[] = [];
  for (const platform of post.platforms as SocialPlatform[]) {
    const acct = accounts.find((a) => a.platform === platform);
    const text = (post.variants as Record<string, string>)[platform] ?? post.content;
    if (!acct) {
      results.push({ platform, ok: false, error: `No connected ${platform} account` });
      continue;
    }
    const r = await publishToPlatform(platform, text, (post.mediaUrls as string[]) ?? [], acct);
    results.push({ platform, ...r });
  }
  // Replace previous results for this post.
  await db.delete(socialPostResultsTable).where(eq(socialPostResultsTable.postId, postId));
  for (const r of results) {
    await db.insert(socialPostResultsTable).values({
      postId,
      organizationId: orgId,
      platform: r.platform,
      status: r.ok ? "posted" : "failed",
      externalId: r.externalId ?? null,
      externalUrl: r.externalUrl ?? null,
      error: r.error ?? null,
      publishedAt: r.ok ? new Date() : null,
    });
  }
  const okCount = results.filter((r) => r.ok).length;
  const status = okCount === results.length ? "posted" : okCount === 0 ? "failed" : "partial";
  await db
    .update(socialPostsTable)
    .set({ status, publishedAt: okCount > 0 ? new Date() : null, updatedAt: new Date() })
    .where(eq(socialPostsTable.id, postId));
}

socialRouter.post("/social/posts/:id/publish", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  await publishPost(orgId, id);
  const [row] = await db
    .select()
    .from(socialPostsTable)
    .where(and(eq(socialPostsTable.id, id), eq(socialPostsTable.organizationId, orgId)));
  const results = await db.select().from(socialPostResultsTable).where(eq(socialPostResultsTable.postId, id));
  if (!row) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  await logAction(req, "PUBLISH", "social_post", id, `Status ${row.status}`);
  res.json(fmtPost(row, results));
});

socialRouter.get("/social/calendar", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const rows = await db
    .select()
    .from(socialPostsTable)
    .where(eq(socialPostsTable.organizationId, orgId))
    .orderBy(desc(socialPostsTable.scheduledAt));
  res.json(
    rows.map((p) => ({
      id: p.id,
      content: p.content.slice(0, 80),
      platforms: p.platforms ?? [],
      status: p.status,
      scheduledAt: p.scheduledAt?.toISOString() ?? null,
      publishedAt: p.publishedAt?.toISOString() ?? null,
    })),
  );
});

export default socialRouter;
