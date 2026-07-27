import { Router } from "express";
import { getDb } from "../lib/firebase";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";
import { scoreLead } from "../lib/leadScoring";

const db = () => getDb();

const integrationsRouter = Router();
const VALID_PROVIDERS = ["indiamart", "smtp", "twilio"] as const;
type Provider = (typeof VALID_PROVIDERS)[number];

function fmt(i: Record<string, unknown>) {
  return {
    id: i.id as string,
    provider: i.provider as string,
    enabled: i.enabled as boolean,
    config: (i.config as Record<string, unknown>) ?? {},
    lastSyncedAt: (i.lastSyncedAt as string) ?? null,
    lastSyncStatus: (i.lastSyncStatus as string) ?? null,
    lastSyncMessage: (i.lastSyncMessage as string) ?? null,
    createdAt: i.createdAt as string,
    updatedAt: i.updatedAt as string,
  };
}

integrationsRouter.get("/integrations", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const snap = await db().collection("integrations").where("organizationId", "==", orgId).get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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
  for (const k of Object.keys(cfg)) if (cfg[k] === "") delete cfg[k];
  const existingSnap = await db()
    .collection("integrations")
    .where("organizationId", "==", orgId)
    .where("provider", "==", provider)
    .limit(1)
    .get();
  let row;
  if (!existingSnap.empty) {
    const doc = existingSnap.docs[0];
    await doc.ref.update({ enabled: enabled ?? doc.data().enabled, config: cfg, updatedAt: new Date().toISOString() });
    const updated = await doc.ref.get();
    row = { id: updated.id, ...updated.data() };
  } else {
    const ref = await db().collection("integrations").add({ organizationId: orgId, provider, enabled: enabled ?? true, config: cfg, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    const snap = await ref.get();
    row = { id: snap.id, ...snap.data() };
  }
  await logAction(req, "UPSERT", "integration", row.id, `Provider ${provider}`);
  res.json(fmt(row));
});

integrationsRouter.delete("/integrations/:provider", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user!.organizationId;
  const provider = req.params.provider as Provider;
  const snap = await db()
    .collection("integrations")
    .where("organizationId", "==", orgId)
    .where("provider", "==", provider)
    .get();
  for (const doc of snap.docs) {
    await doc.ref.delete();
  }
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
  const integrationSnap = await db()
    .collection("integrations")
    .where("organizationId", "==", orgId)
    .where("provider", "==", "indiamart")
    .limit(1)
    .get();
  const integration = integrationSnap.empty ? null : { id: integrationSnap.docs[0].id, ...integrationSnap.docs[0].data() } as Record<string, unknown>;
  if (!integration || !(integration.config as Record<string, unknown>)?.apiKey) {
    res.status(400).json({ error: "IndiaMart integration not configured. Save your API key first." });
    return;
  }
  const apiKey = (integration.config as Record<string, unknown>).apiKey as string;
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
      const existsSnap = await db()
        .collection("leads")
        .where("organizationId", "==", orgId)
        .where("externalId", "==", item.UNIQUE_QUERY_ID)
        .limit(1)
        .get();
      if (!existsSnap.empty) continue;
      const sc = scoreLead({
        source: "indiamart",
        phone: item.SENDER_MOBILE,
        email: item.SENDER_EMAIL,
      } as never);
      await db().collection("leads").add({
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      imported++;
    }
    message = `Imported ${imported} new leads from IndiaMart.`;
    await db().collection("integrations").doc(integration.id).update({ lastSyncedAt: new Date().toISOString(), lastSyncStatus: "success", lastSyncMessage: message });
    res.json({ imported, message });
  } catch (e) {
    message = (e as Error).message;
    await db().collection("integrations").doc(integration.id).update({ lastSyncedAt: new Date().toISOString(), lastSyncStatus: "error", lastSyncMessage: message });
    res.status(502).json({ imported, message: `Sync failed: ${message}` });
  }
});

export default integrationsRouter;
