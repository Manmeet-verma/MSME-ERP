import { Router } from "express";
import { getDb } from "../lib/firebase";
import { requireAuth } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";
import { aiDraftSocialPost, aiRewriteTone } from "../lib/ai";

const db = () => getDb();

const SOCIAL_PLATFORMS = ["facebook", "instagram", "linkedin"] as const;
type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

const socialRouter = Router();

function fmtAccount(a: Record<string, unknown>) {
  return {
    id: a.id as string,
    platform: a.platform as string,
    externalId: a.externalId as string,
    accountName: a.accountName as string,
    status: a.status as string,
    expiresAt: (a.expiresAt as string) ?? null,
    metadata: (a.metadata as Record<string, unknown>) ?? {},
    createdAt: a.createdAt as string,
    updatedAt: a.updatedAt as string,
  };
}

function fmtPost(p: Record<string, unknown>, results: Record<string, unknown>[] = []) {
  return {
    id: p.id as string,
    content: p.content as string,
    mediaUrls: (p.mediaUrls as string[]) ?? [],
    platforms: (p.platforms as string[]) ?? [],
    variants: (p.variants as Record<string, string>) ?? {},
    status: p.status as string,
    scheduledAt: (p.scheduledAt as string) ?? null,
    publishedAt: (p.publishedAt as string) ?? null,
    context: (p.context as Record<string, unknown>) ?? {},
    createdAt: p.createdAt as string,
    updatedAt: p.updatedAt as string,
    results: results.map((r) => ({
      id: r.id as string,
      platform: r.platform as string,
      status: r.status as string,
      externalId: (r.externalId as string) ?? null,
      externalUrl: (r.externalUrl as string) ?? null,
      error: (r.error as string) ?? null,
      publishedAt: (r.publishedAt as string) ?? null,
      metrics: (r.metrics as Record<string, number>) ?? {},
    })),
  };
}

// ── Accounts ──
socialRouter.get("/social/accounts", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const snap = await db().collection("social_accounts").where("organizationId", "==", orgId).get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  res.json(rows.map(fmtAccount));
});

socialRouter.post("/social/accounts", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const { platform, externalId, accountName, accessToken, refreshToken, expiresAt, metadata } = req.body ?? {};
  if (!platform || !(SOCIAL_PLATFORMS as readonly string[]).includes(platform) || !externalId || !accountName || !accessToken) {
    res.status(400).json({ error: "platform, externalId, accountName, accessToken required" });
    return;
  }
  const existingSnap = await db()
    .collection("social_accounts")
    .where("organizationId", "==", orgId)
    .where("platform", "==", platform)
    .where("externalId", "==", externalId)
    .limit(1)
    .get();
  let row: Record<string, unknown>;
  if (!existingSnap.empty) {
    const doc = existingSnap.docs[0];
    await doc.ref.update({
      accountName,
      accessToken,
      refreshToken: refreshToken ?? null,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      status: "active",
      metadata: metadata ?? {},
      updatedAt: new Date().toISOString(),
    });
    const updated = await doc.ref.get();
    row = { id: updated.id, ...updated.data() };
  } else {
    const ref = await db().collection("social_accounts").add({
      organizationId: orgId,
      platform,
      externalId,
      accountName,
      accessToken,
      refreshToken: refreshToken ?? null,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      status: "active",
      metadata: metadata ?? {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const snap = await ref.get();
    row = { id: snap.id, ...snap.data() };
  }
  await logAction(req, "CONNECT", "social_account", row.id as string, `Platform ${platform}`);
  res.status(201).json(fmtAccount(row));
});

// ── OAuth ──
const oauthStates = new Map<string, { orgId: string; platform: SocialPlatform; userId: string; createdAt: number }>();
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
    let expiresAt = tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null;
    const metadata: Record<string, unknown> = { connectedVia: "oauth" };

    if (platform === "facebook" || platform === "instagram") {
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
          if (lld.expires_in) expiresAt = new Date(Date.now() + lld.expires_in * 1000).toISOString();
        }
      } catch { /* fall through */ }
      const pagesResp = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${encodeURIComponent(accessToken)}&fields=id,name,access_token,instagram_business_account`);
      const pagesData = (await pagesResp.json()) as { data?: Array<{ id: string; name: string; access_token: string; instagram_business_account?: { id: string } }> };
      const page = pagesData.data?.[0];
      if (!page) {
        res.status(400).send("No Facebook Pages found on this account. Create or get admin access to a Page first.");
        return;
      }
      accessToken = page.access_token;
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
    const existingSnap = await db()
      .collection("social_accounts")
      .where("organizationId", "==", stateEntry.orgId)
      .where("platform", "==", platform)
      .where("externalId", "==", externalId)
      .limit(1)
      .get();
    if (!existingSnap.empty) {
      const doc = existingSnap.docs[0];
      await doc.ref.update({ accessToken, accountName, refreshToken: tokenData.refresh_token ?? null, expiresAt, status: "active", updatedAt: new Date().toISOString() });
    } else {
      await db().collection("social_accounts").add({
        organizationId: stateEntry.orgId,
        platform, externalId, accountName, accessToken,
        refreshToken: tokenData.refresh_token ?? null,
        expiresAt, status: "active", metadata,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
  const id = req.params.id;
  const docSnap = await db().collection("social_accounts").doc(id).get();
  if (docSnap.exists && docSnap.data()!.organizationId === orgId) {
    const acct = docSnap.data()!;
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
    await docSnap.ref.delete();
  }
  await logAction(req, "DISCONNECT", "social_account", id);
  res.json({ message: "Account disconnected" });
});

// Refresh metrics
socialRouter.post("/social/posts/:id/refresh-metrics", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = req.params.id;
  const postSnap = await db().collection("social_posts").doc(id).get();
  if (!postSnap.exists || postSnap.data()!.organizationId !== orgId) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  const postData = postSnap.data()!;
  const resultsSnap = await db().collection("social_post_results").where("postId", "==", id).get();
  const results = resultsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const accountsSnap = await db().collection("social_accounts").where("organizationId", "==", orgId).get();
  const accounts = accountsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
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
      await db().collection("social_post_results").doc(r.id).update({ metrics });
    } catch (e) {
      req.log?.warn?.({ err: e, platform: r.platform }, "Metrics fetch failed");
    }
  }
  const refreshed = await db().collection("social_post_results").where("postId", "==", id).get();
  const refreshedRows = refreshed.docs.map((d) => ({ id: d.id, ...d.data() }));
  res.json(fmtPost({ id: postSnap.id, ...postData }, refreshedRows));
});

// ── Posts ──
socialRouter.get("/social/posts", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const from = req.query.from ? new Date(String(req.query.from)).toISOString() : null;
  const to = req.query.to ? new Date(String(req.query.to)).toISOString() : null;
  let q: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db().collection("social_posts").where("organizationId", "==", orgId);
  if (from) q = q.where("createdAt", ">=", from);
  if (to) q = q.where("createdAt", "<=", to);
  const snap = await q.get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  rows.sort((a, b) => ((b.createdAt as string) ?? "").localeCompare((a.createdAt as string) ?? ""));
  const resultsSnap = await db().collection("social_post_results").where("organizationId", "==", orgId).get();
  const allResults = resultsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const resultsByPost = new Map<string, Record<string, unknown>[]>();
  for (const r of allResults) {
    const arr = resultsByPost.get(r.postId as string) ?? [];
    arr.push(r);
    resultsByPost.set(r.postId as string, arr);
  }
  res.json(rows.map((r) => fmtPost(r, resultsByPost.get(r.id as string) ?? [])));
});

socialRouter.post("/social/posts", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const { content, platforms, variants, mediaUrls, scheduledAt, context, status } = req.body ?? {};
  if (!content || !Array.isArray(platforms) || platforms.length === 0) {
    res.status(400).json({ error: "content and at least one platform required" });
    return;
  }
  const validPlatforms = platforms.filter((p: string) => (SOCIAL_PLATFORMS as readonly string[]).includes(p));
  const ref = await db().collection("social_posts").add({
    organizationId: orgId,
    content,
    mediaUrls: Array.isArray(mediaUrls) ? mediaUrls : [],
    platforms: validPlatforms,
    variants: variants ?? {},
    status: status === "scheduled" || scheduledAt ? "scheduled" : "draft",
    scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
    context: context ?? {},
    createdById: req.user!.userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  const snap = await ref.get();
  await logAction(req, "CREATE", "social_post", ref.id);
  res.status(201).json(fmtPost({ id: snap.id, ...snap.data() }));
});

socialRouter.patch("/social/posts/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = req.params.id;
  const docSnap = await db().collection("social_posts").doc(id).get();
  if (!docSnap.exists || docSnap.data()!.organizationId !== orgId) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  for (const f of ["content", "platforms", "variants", "mediaUrls", "context", "status"] as const) {
    if (req.body?.[f] !== undefined) updates[f] = req.body[f];
  }
  if (req.body?.scheduledAt !== undefined) {
    updates.scheduledAt = req.body.scheduledAt ? new Date(req.body.scheduledAt).toISOString() : null;
    if (req.body.scheduledAt && !updates.status) updates.status = "scheduled";
  }
  await db().collection("social_posts").doc(id).update(updates);
  const updatedSnap = await db().collection("social_posts").doc(id).get();
  res.json(fmtPost({ id: updatedSnap.id, ...updatedSnap.data() }));
});

socialRouter.delete("/social/posts/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = req.params.id;
  const docSnap = await db().collection("social_posts").doc(id).get();
  if (docSnap.exists && docSnap.data()!.organizationId === orgId) {
    await docSnap.ref.delete();
  }
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
  account: Record<string, unknown>,
): Promise<{ ok: boolean; externalId?: string; externalUrl?: string; error?: string }> {
  try {
    if (platform === "facebook") {
      const payload: Record<string, unknown> = { message: content, access_token: account.accessToken };
      if (mediaUrls[0]) payload.link = mediaUrls[0];
      const r = await fetch(
        `https://graph.facebook.com/v19.0/${encodeURIComponent(account.externalId as string)}/feed`,
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
      const extId = data.id ?? "";
      return { ok: true, externalId: extId, externalUrl: extId ? `https://facebook.com/${extId}` : undefined };
    }
    if (platform === "instagram") {
      const imageUrl = mediaUrls.find((u) => /\.(jpe?g|png|webp)(\?|$)/i.test(u)) ?? mediaUrls[0];
      if (!imageUrl) {
        return { ok: false, error: "Instagram posts require at least one public image URL (jpg/png)." };
      }
      const containerParams = new URLSearchParams({
        image_url: imageUrl,
        caption: content,
        access_token: account.accessToken as string,
      });
      const c = await fetch(
        `https://graph.facebook.com/v19.0/${encodeURIComponent(account.externalId as string)}/media?${containerParams.toString()}`,
        { method: "POST", signal: AbortSignal.timeout(20_000) },
      );
      if (!c.ok) {
        const txt = await c.text().catch(() => `HTTP ${c.status}`);
        return { ok: false, error: txt.slice(0, 500) };
      }
      const cd = (await c.json()) as { id?: string };
      if (!cd.id) return { ok: false, error: "Instagram did not return a container id" };
      for (let i = 0; i < 5; i++) {
        const s = await fetch(
          `https://graph.facebook.com/v19.0/${encodeURIComponent(cd.id)}?fields=status_code&access_token=${encodeURIComponent(account.accessToken as string)}`,
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
      const publishParams = new URLSearchParams({ creation_id: cd.id, access_token: account.accessToken as string });
      const p = await fetch(
        `https://graph.facebook.com/v19.0/${encodeURIComponent(account.externalId as string)}/media_publish?${publishParams.toString()}`,
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
      const author = (account.externalId as string).startsWith("urn:")
        ? account.externalId as string
        : (account.externalId as string).match(/^[0-9]+$/)
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
      const headerId = r.headers.get("x-restli-id") ?? r.headers.get("x-linkedin-id") ?? "";
      let bodyId = "";
      try {
        const j = (await r.json()) as { id?: string };
        bodyId = j.id ?? "";
      } catch { /* empty body is fine */ }
      const extId = headerId || bodyId;
      const extUrl = extId ? `https://www.linkedin.com/feed/update/${encodeURIComponent(extId)}` : undefined;
      return { ok: true, externalId: extId, externalUrl: extUrl };
    }
    return { ok: false, error: "Unknown platform" };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function publishPost(orgId: string, postId: string): Promise<void> {
  const postSnap = await db().collection("social_posts").doc(postId).get();
  if (!postSnap.exists || postSnap.data()!.organizationId !== orgId) return;
  const postData = postSnap.data()!;
  await db().collection("social_posts").doc(postId).update({ status: "publishing", updatedAt: new Date().toISOString() });
  const accountsSnap = await db()
    .collection("social_accounts")
    .where("organizationId", "==", orgId)
    .where("status", "==", "active")
    .get();
  const accounts = accountsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const results: { platform: SocialPlatform; ok: boolean; externalId?: string; externalUrl?: string; error?: string }[] = [];
  for (const platform of postData.platforms as SocialPlatform[]) {
    const acct = accounts.find((a) => a.platform === platform);
    const text = (postData.variants as Record<string, string>)[platform] ?? postData.content;
    if (!acct) {
      results.push({ platform, ok: false, error: `No connected ${platform} account` });
      continue;
    }
    const r = await publishToPlatform(platform, text, (postData.mediaUrls as string[]) ?? [], acct);
    results.push({ platform, ...r });
  }
  // Replace previous results for this post.
  const oldResults = await db().collection("social_post_results").where("postId", "==", postId).get();
  for (const doc of oldResults.docs) {
    await doc.ref.delete();
  }
  for (const r of results) {
    await db().collection("social_post_results").add({
      postId,
      organizationId: orgId,
      platform: r.platform,
      status: r.ok ? "posted" : "failed",
      externalId: r.externalId ?? null,
      externalUrl: r.externalUrl ?? null,
      error: r.error ?? null,
      publishedAt: r.ok ? new Date().toISOString() : null,
      createdAt: new Date().toISOString(),
    });
  }
  const okCount = results.filter((r) => r.ok).length;
  const status = okCount === results.length ? "posted" : okCount === 0 ? "failed" : "partial";
  await db().collection("social_posts").doc(postId).update({
    status,
    publishedAt: okCount > 0 ? new Date().toISOString() : null,
    updatedAt: new Date().toISOString(),
  });
}

socialRouter.post("/social/posts/:id/publish", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = req.params.id;
  await publishPost(orgId, id);
  const postSnap = await db().collection("social_posts").doc(id).get();
  if (!postSnap.exists || postSnap.data()!.organizationId !== orgId) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  const row = { id: postSnap.id, ...postSnap.data() };
  const resultsSnap = await db().collection("social_post_results").where("postId", "==", id).get();
  const results = resultsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  await logAction(req, "PUBLISH", "social_post", id, `Status ${row.status}`);
  res.json(fmtPost(row, results));
});

socialRouter.get("/social/calendar", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const snap = await db().collection("social_posts").where("organizationId", "==", orgId).get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  rows.sort((a, b) => ((b.scheduledAt as string) ?? "").localeCompare((a.scheduledAt as string) ?? ""));
  res.json(
    rows.map((p) => ({
      id: p.id,
      content: (p.content as string).slice(0, 80),
      platforms: (p.platforms as string[]) ?? [],
      status: p.status as string,
      scheduledAt: (p.scheduledAt as string) ?? null,
      publishedAt: (p.publishedAt as string) ?? null,
    })),
  );
});

export default socialRouter;
