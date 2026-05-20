import { Router } from "express";
import { db, integrationsTable, leadsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";
import { scoreLead } from "../lib/leadScoring";

const integrationsRouter = Router();
const VALID_PROVIDERS = ["indiamart", "smtp", "twilio"] as const;
type Provider = (typeof VALID_PROVIDERS)[number];

function fmt(i: typeof integrationsTable.$inferSelect) {
  return {
    id: i.id,
    provider: i.provider,
    enabled: i.enabled,
    config: i.config ?? {},
    lastSyncedAt: i.lastSyncedAt?.toISOString() ?? null,
    lastSyncStatus: i.lastSyncStatus ?? null,
    lastSyncMessage: i.lastSyncMessage ?? null,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
  };
}

integrationsRouter.get("/integrations", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const rows = await db
    .select()
    .from(integrationsTable)
    .where(eq(integrationsTable.organizationId, orgId));
  res.json(rows.map(fmt));
});

integrationsRouter.put("/integrations/:provider", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user!.organizationId;
  const provider = req.params.provider as Provider;
  if (!VALID_PROVIDERS.includes(provider)) {
    res.status(400).json({ error: "Invalid provider" });
    return;
  }
  const { enabled, config } = req.body ?? {};
  const cfg = typeof config === "object" && config !== null ? (config as Record<string, string>) : {};
  // Strip empty strings
  for (const k of Object.keys(cfg)) if (cfg[k] === "") delete cfg[k];
  const [existing] = await db
    .select()
    .from(integrationsTable)
    .where(and(eq(integrationsTable.organizationId, orgId), eq(integrationsTable.provider, provider)));
  let row;
  if (existing) {
    [row] = await db
      .update(integrationsTable)
      .set({ enabled: enabled ?? existing.enabled, config: cfg, updatedAt: new Date() })
      .where(eq(integrationsTable.id, existing.id))
      .returning();
  } else {
    [row] = await db
      .insert(integrationsTable)
      .values({ organizationId: orgId, provider, enabled: enabled ?? true, config: cfg })
      .returning();
  }
  await logAction(req, "UPSERT", "integration", row.id, `Provider ${provider}`);
  res.json(fmt(row));
});

integrationsRouter.delete("/integrations/:provider", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user!.organizationId;
  const provider = req.params.provider as Provider;
  await db
    .delete(integrationsTable)
    .where(and(eq(integrationsTable.organizationId, orgId), eq(integrationsTable.provider, provider)));
  res.json({ message: "Integration removed" });
});

interface IndiamartLead {
  UNIQUE_QUERY_ID?: string;
  QUERY_TIME?: string;
  SENDER_NAME?: string;
  SENDER_MOBILE?: string;
  SENDER_EMAIL?: string;
  SENDER_COMPANY?: string;
  SENDER_CITY?: string;
  SENDER_STATE?: string;
  QUERY_PRODUCT_NAME?: string;
  QUERY_MESSAGE?: string;
}

integrationsRouter.post("/integrations/indiamart/sync", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user!.organizationId;
  const [integration] = await db
    .select()
    .from(integrationsTable)
    .where(and(eq(integrationsTable.organizationId, orgId), eq(integrationsTable.provider, "indiamart")));
  if (!integration || !integration.config?.apiKey) {
    res.status(400).json({ error: "IndiaMart integration not configured. Save your API key first." });
    return;
  }
  const apiKey = integration.config.apiKey;
  let imported = 0;
  let message = "";
  try {
    const url = `https://mapi.indiamart.com/wservce/crm/crmListing/v2/?glusr_crm_key=${encodeURIComponent(apiKey)}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = (await resp.json()) as { STATUS?: string; RESPONSE?: IndiamartLead[]; MESSAGE?: string };
    if (data.STATUS && data.STATUS !== "SUCCESS") throw new Error(data.MESSAGE ?? "IndiaMart returned an error");
    const items = Array.isArray(data.RESPONSE) ? data.RESPONSE : [];
    for (const item of items) {
      if (!item.UNIQUE_QUERY_ID) continue;
      const [exists] = await db
        .select()
        .from(leadsTable)
        .where(and(eq(leadsTable.organizationId, orgId), eq(leadsTable.externalId, item.UNIQUE_QUERY_ID)));
      if (exists) continue;
      const sc = scoreLead({
        source: "indiamart",
        phone: item.SENDER_MOBILE,
        email: item.SENDER_EMAIL,
      } as never);
      await db.insert(leadsTable).values({
        organizationId: orgId,
        name: item.SENDER_NAME ?? "IndiaMart lead",
        email: item.SENDER_EMAIL ?? null,
        phone: item.SENDER_MOBILE ?? null,
        company: item.SENDER_COMPANY ?? null,
        city: item.SENDER_CITY ?? null,
        state: item.SENDER_STATE ?? null,
        source: "indiamart",
        externalId: item.UNIQUE_QUERY_ID,
        status: "new",
        priority: sc.priority,
        score: sc.score,
        product: item.QUERY_PRODUCT_NAME ?? null,
        notes: item.QUERY_MESSAGE ?? null,
        nextAction: sc.nextAction,
        metadata: { queryTime: item.QUERY_TIME },
      });
      imported++;
    }
    message = `Imported ${imported} new leads from IndiaMart.`;
    await db
      .update(integrationsTable)
      .set({ lastSyncedAt: new Date(), lastSyncStatus: "success", lastSyncMessage: message })
      .where(eq(integrationsTable.id, integration.id));
    res.json({ imported, message });
  } catch (e) {
    message = (e as Error).message;
    await db
      .update(integrationsTable)
      .set({ lastSyncedAt: new Date(), lastSyncStatus: "error", lastSyncMessage: message })
      .where(eq(integrationsTable.id, integration.id));
    res.status(502).json({ imported, message: `Sync failed: ${message}` });
  }
});

export default integrationsRouter;
