import { Router } from "express";
import { getDb } from "../lib/firebase";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { scoreLead } from "../lib/leadScoring";

const db = () => getDb();

const leadSourcesRouter = Router();

type Provider = "tradeindia" | "justdial" | "fb_lead_ads";

interface NormalizedLead {
  externalId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  city?: string | null;
  state?: string | null;
  product?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
}

async function importLeads(
  orgId: string,
  source: Provider,
  leads: NormalizedLead[],
): Promise<number> {
  let imported = 0;
  for (const l of leads) {
    if (!l.externalId) continue;
    const existsSnap = await db()
      .collection("leads")
      .where("organizationId", "==", orgId)
      .where("externalId", "==", l.externalId)
      .limit(1)
      .get();
    if (!existsSnap.empty) continue;
    const sc = scoreLead({ source, phone: l.phone ?? undefined, email: l.email ?? undefined } as never);
    await db().collection("leads").add({
      organizationId: orgId,
      name: l.name || "Lead",
      email: l.email ?? null,
      phone: l.phone ?? null,
      company: l.company ?? null,
      city: l.city ?? null,
      state: l.state ?? null,
      source,
      externalId: l.externalId,
      status: "new",
      priority: sc.priority,
      score: sc.score,
      product: l.product ?? null,
      notes: l.notes ?? null,
      nextAction: sc.nextAction,
      metadata: l.metadata ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    imported++;
  }
  return imported;
}

async function recordSync(
  orgId: string,
  provider: Provider,
  status: "success" | "error",
  message: string,
): Promise<void> {
  const snap = await db()
    .collection("integrations")
    .where("organizationId", "==", orgId)
    .where("provider", "==", provider)
    .limit(1)
    .get();
  for (const doc of snap.docs) {
    await doc.ref.update({ lastSyncedAt: new Date().toISOString(), lastSyncStatus: status, lastSyncMessage: message });
  }
}

async function getIntegrationConfig(orgId: string, provider: Provider): Promise<Record<string, string> | null> {
  const snap = await db()
    .collection("integrations")
    .where("organizationId", "==", orgId)
    .where("provider", "==", provider)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return (snap.docs[0].data().config as Record<string, string>) ?? null;
}

// TradeIndia
leadSourcesRouter.post("/integrations/tradeindia/sync", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user!.organizationId;
  const cfg = await getIntegrationConfig(orgId, "tradeindia");
  if (!cfg?.userId || !cfg?.profileId || !cfg?.key) {
    res.status(400).json({ error: "TradeIndia integration not configured (need userId, profileId, key)." });
    return;
  }
  try {
    const since = new Date(Date.now() - 7 * 86400000);
    const fromDate = since.toISOString().slice(0, 10);
    const toDate = new Date().toISOString().slice(0, 10);
    const url = `https://www.tradeindia.com/utils/my_inquiry.html?userid=${encodeURIComponent(cfg.userId)}&profile_id=${encodeURIComponent(cfg.profileId)}&key=${encodeURIComponent(cfg.key)}&from_date=${fromDate}&to_date=${toDate}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = (await resp.json()) as { inquiries?: Array<Record<string, string>> } | Array<Record<string, string>>;
    const items: Array<Record<string, string>> = Array.isArray(data)
      ? data
      : Array.isArray((data as { inquiries?: unknown }).inquiries)
        ? (data as { inquiries: Array<Record<string, string>> }).inquiries
        : [];
    const normalized: NormalizedLead[] = items.map((it) => ({
      externalId: String(it.inquiry_id ?? it.id ?? `${it.email ?? ""}-${it.phone_no ?? ""}`),
      name: it.name ?? it.contact_person ?? "TradeIndia lead",
      email: it.email ?? null,
      phone: it.phone_no ?? it.mobile ?? null,
      company: it.company ?? null,
      city: it.city ?? null,
      state: it.state ?? null,
      product: it.subject ?? it.product ?? null,
      notes: it.message ?? null,
      metadata: { receivedAt: it.date ?? null },
    }));
    const imported = await importLeads(orgId, "tradeindia", normalized);
    const message = `Imported ${imported} new leads from TradeIndia.`;
    await recordSync(orgId, "tradeindia", "success", message);
    res.json({ imported, message });
  } catch (e) {
    const message = (e as Error).message;
    await recordSync(orgId, "tradeindia", "error", message);
    res.status(502).json({ imported: 0, message: `Sync failed: ${message}` });
  }
});

// JustDial
leadSourcesRouter.post("/integrations/justdial/sync", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user!.organizationId;
  const cfg = await getIntegrationConfig(orgId, "justdial");
  if (!cfg?.authKey || !cfg?.userId) {
    res.status(400).json({ error: "JustDial integration not configured (need userId, authKey)." });
    return;
  }
  try {
    const resp = await fetch("https://api.justdial.com/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.authKey}` },
      body: JSON.stringify({ userId: cfg.userId, days: 7 }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = (await resp.json()) as { leads?: Array<Record<string, string>> };
    const items = Array.isArray(data.leads) ? data.leads : [];
    const normalized: NormalizedLead[] = items.map((it) => ({
      externalId: String(it.leadid ?? it.id ?? `${it.email ?? ""}-${it.mobile ?? ""}`),
      name: it.prefix ? `${it.prefix} ${it.name ?? ""}`.trim() : (it.name ?? "JustDial lead"),
      email: it.email ?? null,
      phone: it.mobile ?? it.phone ?? null,
      city: it.city ?? null,
      product: it.category ?? null,
      notes: it.requirement ?? it.message ?? null,
      metadata: { source_label: it.source ?? null },
    }));
    const imported = await importLeads(orgId, "justdial", normalized);
    const message = `Imported ${imported} new leads from JustDial.`;
    await recordSync(orgId, "justdial", "success", message);
    res.json({ imported, message });
  } catch (e) {
    const message = (e as Error).message;
    await recordSync(orgId, "justdial", "error", message);
    res.status(502).json({ imported: 0, message: `Sync failed: ${message}` });
  }
});

// Facebook Lead Ads
leadSourcesRouter.post("/integrations/fb-lead-ads/sync", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user!.organizationId;
  const cfg = await getIntegrationConfig(orgId, "fb_lead_ads");
  if (!cfg?.accessToken || !cfg?.formIds) {
    res.status(400).json({ error: "FB Lead Ads not configured (need accessToken, formIds)." });
    return;
  }
  const formIds = cfg.formIds.split(",").map((s) => s.trim()).filter(Boolean);
  let imported = 0;
  try {
    for (const formId of formIds) {
      const url = `https://graph.facebook.com/v20.0/${encodeURIComponent(formId)}/leads?access_token=${encodeURIComponent(cfg.accessToken)}&limit=50`;
      const resp = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (!resp.ok) throw new Error(`Form ${formId}: HTTP ${resp.status}`);
      const data = (await resp.json()) as {
        data?: Array<{ id: string; created_time: string; field_data?: Array<{ name: string; values: string[] }> }>;
      };
      const items = Array.isArray(data.data) ? data.data : [];
      const normalized: NormalizedLead[] = items.map((it) => {
        const fields = new Map<string, string>();
        for (const fd of it.field_data ?? []) {
          fields.set(fd.name.toLowerCase(), Array.isArray(fd.values) ? fd.values.join(", ") : "");
        }
        return {
          externalId: it.id,
          name: fields.get("full_name") ?? fields.get("first_name") ?? fields.get("name") ?? "FB lead",
          email: fields.get("email") ?? null,
          phone: fields.get("phone_number") ?? fields.get("phone") ?? null,
          company: fields.get("company_name") ?? fields.get("company") ?? null,
          city: fields.get("city") ?? null,
          state: fields.get("state") ?? null,
          product: fields.get("product") ?? null,
          notes: fields.get("message") ?? fields.get("comments") ?? null,
          metadata: { formId, createdTime: it.created_time },
        };
      });
      imported += await importLeads(orgId, "fb_lead_ads", normalized);
    }
    const message = `Imported ${imported} new leads from Facebook Lead Ads (${formIds.length} forms).`;
    await recordSync(orgId, "fb_lead_ads", "success", message);
    res.json({ imported, message });
  } catch (e) {
    const message = (e as Error).message;
    await recordSync(orgId, "fb_lead_ads", "error", message);
    res.status(502).json({ imported, message: `Sync failed: ${message}` });
  }
});

export default leadSourcesRouter;
