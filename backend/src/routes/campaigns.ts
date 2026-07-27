import { Router } from "express";
import { getDb } from "../lib/firebase";
import { requireAuth } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";

const db = () => getDb();

const campaignsRouter = Router();

function fmt(c: Record<string, unknown>) {
  return {
    id: c.id as string,
    name: c.name as string,
    subject: c.subject as string,
    body: c.body as string,
    fromEmail: c.fromEmail as string,
    segment: c.segment as Record<string, unknown>,
    status: c.status as string,
    scheduledAt: (c.scheduledAt as string) ?? null,
    sentAt: (c.sentAt as string) ?? null,
    stats: (c.stats as Record<string, unknown>) ?? { total: 0, sent: 0, opened: 0, clicked: 0 },
    subjectB: (c.subjectB as string) ?? null,
    bodyB: (c.bodyB as string) ?? null,
    abEnabled: Boolean(c.abEnabled),
    abSplitPercent: Number(c.abSplitPercent ?? 50),
    winnerVariant: (c.winnerVariant as string) ?? null,
    createdAt: c.createdAt as string,
    updatedAt: c.updatedAt as string,
  };
}

campaignsRouter.get("/campaigns", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const snap = await db().collection("campaigns").where("organizationId", "==", orgId).get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  rows.sort((a, b) => ((b.createdAt as string) ?? "").localeCompare((a.createdAt as string) ?? ""));
  res.json(rows.map(fmt));
});

campaignsRouter.post("/campaigns", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const b = req.body ?? {};
  if (!b.name || !b.subject || !b.body || !b.fromEmail || !b.segment) {
    res.status(400).json({ error: "name, subject, body, fromEmail, segment required" });
    return;
  }
  const ref = await db().collection("campaigns").add({
    organizationId: orgId,
    name: b.name,
    subject: b.subject,
    body: b.body,
    fromEmail: b.fromEmail,
    segment: b.segment,
    status: b.scheduledAt ? "scheduled" : "draft",
    scheduledAt: b.scheduledAt ? new Date(b.scheduledAt).toISOString() : null,
    subjectB: b.subjectB ?? null,
    bodyB: b.bodyB ?? null,
    abEnabled: Boolean(b.abEnabled),
    abSplitPercent: b.abSplitPercent != null ? Number(b.abSplitPercent) : 50,
    createdById: req.user!.userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  const snap = await ref.get();
  const c = { id: snap.id, ...snap.data() };
  await logAction(req, "CREATE", "campaign", ref.id);
  res.status(201).json(fmt(c));
});

campaignsRouter.get("/campaigns/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = req.params.id;
  const docSnap = await db().collection("campaigns").doc(id).get();
  if (!docSnap.exists || docSnap.data()!.organizationId !== orgId) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }
  const c = { id: docSnap.id, ...docSnap.data() };
  const recsSnap = await db().collection("campaign_recipients").where("campaignId", "==", id).get();
  const recs = recsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  recs.sort((a, b) => ((b.id as string) ?? "").localeCompare((a.id as string) ?? ""));
  res.json({
    ...fmt(c),
    recipients: recs.map((r) => ({
      id: r.id,
      email: r.email as string,
      name: (r.name as string) ?? null,
      leadId: (r.leadId as string) ?? null,
      clientId: (r.clientId as string) ?? null,
      status: r.status as string,
      sentAt: (r.sentAt as string) ?? null,
      openedAt: (r.openedAt as string) ?? null,
      clickedAt: (r.clickedAt as string) ?? null,
    })),
  });
});

campaignsRouter.patch("/campaigns/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = req.params.id;
  const docSnap = await db().collection("campaigns").doc(id).get();
  if (!docSnap.exists || docSnap.data()!.organizationId !== orgId) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  for (const f of ["name", "subject", "body", "fromEmail", "segment", "subjectB", "bodyB", "abEnabled", "abSplitPercent", "winnerVariant"] as const) {
    if (req.body?.[f] !== undefined) updates[f] = req.body[f];
  }
  if (req.body?.scheduledAt !== undefined) updates.scheduledAt = req.body.scheduledAt ? new Date(req.body.scheduledAt).toISOString() : null;
  await db().collection("campaigns").doc(id).update(updates);
  const updatedSnap = await db().collection("campaigns").doc(id).get();
  const c = { id: updatedSnap.id, ...updatedSnap.data() };
  res.json(fmt(c));
});

campaignsRouter.post("/campaigns/:id/send", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = req.params.id;
  const docSnap = await db().collection("campaigns").doc(id).get();
  if (!docSnap.exists || docSnap.data()!.organizationId !== orgId) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }
  const cData = docSnap.data()!;
  const c = { id: docSnap.id, ...cData };
  const entity = (cData.segment as Record<string, unknown>)?.entity ?? "leads";
  const filters = ((cData.segment as Record<string, unknown>)?.filters ?? {}) as Record<string, string>;
  let recipients: { email: string; name: string; leadId: string | null; clientId: string | null }[] = [];
  if (entity === "leads") {
    const leadsSnap = await db().collection("leads").where("organizationId", "==", orgId).get();
    recipients = leadsSnap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Record<string, unknown>))
      .filter((r) => (filters.status ? r.status === filters.status : true))
      .filter((r) => (filters.priority ? r.priority === filters.priority : true))
      .filter((r) => !!r.email)
      .map((r) => ({ email: r.email as string, name: r.name as string, leadId: r.id as string, clientId: null }));
  } else {
    const clientsSnap = await db().collection("clients").where("organizationId", "==", orgId).get();
    recipients = clientsSnap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Record<string, unknown>))
      .filter((r) => !!r.email)
      .map((r) => ({ email: r.email as string, name: r.name as string, leadId: null, clientId: r.id as string }));
  }
  // Filter out suppressed emails
  const suppSnap = await db().collection("email_suppressions").where("organizationId", "==", orgId).get();
  const suppressedSet = new Set(suppSnap.docs.map((d) => (d.data().email as string).toLowerCase()));
  recipients = recipients.filter((r) => !suppressedSet.has(r.email.toLowerCase()));

  // A/B split if enabled
  const abEnabled = Boolean(cData.abEnabled) && cData.subjectB;
  const splitPct = Math.max(0, Math.min(100, Number(cData.abSplitPercent ?? 50)));
  for (let i = 0; i < recipients.length; i++) {
    const r = recipients[i];
    const variant: "a" | "b" = abEnabled && (i * 100) / Math.max(1, recipients.length) >= splitPct ? "b" : "a";
    const useSubject = variant === "b" && cData.subjectB ? cData.subjectB : cData.subject;
    const useBody = variant === "b" && cData.bodyB ? cData.bodyB : cData.body;
    const recRef = await db().collection("campaign_recipients").add({
      campaignId: id,
      organizationId: orgId,
      email: r.email,
      name: r.name,
      leadId: r.leadId,
      clientId: r.clientId,
      status: "sent",
      variant: abEnabled ? variant : null,
      sentAt: new Date().toISOString(),
    });
    await db().collection("emails").add({
      organizationId: orgId,
      leadId: r.leadId,
      clientId: r.clientId,
      userId: req.user!.userId,
      direction: "outbound",
      fromEmail: cData.fromEmail,
      toEmail: r.email,
      subject: useSubject,
      body: useBody,
      status: "sent",
      sentAt: new Date().toISOString(),
      messageId: `<campaign-${id}-rec-${recRef.id}@msme-pro>`,
      createdAt: new Date().toISOString(),
    });
  }
  await db().collection("campaigns").doc(id).update({
    status: "sent",
    sentAt: new Date().toISOString(),
    stats: { total: recipients.length, sent: recipients.length, opened: 0, clicked: 0 },
    updatedAt: new Date().toISOString(),
  });
  const updatedSnap = await db().collection("campaigns").doc(id).get();
  const updated = { id: updatedSnap.id, ...updatedSnap.data() };
  await logAction(req, "SEND_CAMPAIGN", "campaign", id, `Sent to ${recipients.length}`);
  res.json(fmt(updated));
});

export default campaignsRouter;
