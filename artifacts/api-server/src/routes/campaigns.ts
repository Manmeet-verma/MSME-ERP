import { Router } from "express";
import { db, campaignsTable, campaignRecipientsTable, leadsTable, clientsTable, emailsTable } from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";

const campaignsRouter = Router();

function fmt(c: typeof campaignsTable.$inferSelect) {
  return {
    id: c.id,
    name: c.name,
    subject: c.subject,
    body: c.body,
    fromEmail: c.fromEmail,
    segment: c.segment,
    status: c.status,
    scheduledAt: c.scheduledAt?.toISOString() ?? null,
    sentAt: c.sentAt?.toISOString() ?? null,
    stats: c.stats ?? { total: 0, sent: 0, opened: 0, clicked: 0 },
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

campaignsRouter.get("/campaigns", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const rows = await db
    .select()
    .from(campaignsTable)
    .where(eq(campaignsTable.organizationId, orgId))
    .orderBy(desc(campaignsTable.createdAt));
  res.json(rows.map(fmt));
});

campaignsRouter.post("/campaigns", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const b = req.body ?? {};
  if (!b.name || !b.subject || !b.body || !b.fromEmail || !b.segment) {
    res.status(400).json({ error: "name, subject, body, fromEmail, segment required" });
    return;
  }
  const [c] = await db
    .insert(campaignsTable)
    .values({
      organizationId: orgId,
      name: b.name,
      subject: b.subject,
      body: b.body,
      fromEmail: b.fromEmail,
      segment: b.segment,
      status: b.scheduledAt ? "scheduled" : "draft",
      scheduledAt: b.scheduledAt ? new Date(b.scheduledAt) : null,
      createdById: req.user!.userId,
    })
    .returning();
  await logAction(req, "CREATE", "campaign", c.id);
  res.status(201).json(fmt(c));
});

campaignsRouter.get("/campaigns/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  const [c] = await db
    .select()
    .from(campaignsTable)
    .where(and(eq(campaignsTable.id, id), eq(campaignsTable.organizationId, orgId)));
  if (!c) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }
  const recs = await db
    .select()
    .from(campaignRecipientsTable)
    .where(eq(campaignRecipientsTable.campaignId, id))
    .orderBy(desc(campaignRecipientsTable.id));
  res.json({
    ...fmt(c),
    recipients: recs.map((r) => ({
      id: r.id,
      email: r.email,
      name: r.name ?? null,
      leadId: r.leadId ?? null,
      clientId: r.clientId ?? null,
      status: r.status,
      sentAt: r.sentAt?.toISOString() ?? null,
      openedAt: r.openedAt?.toISOString() ?? null,
      clickedAt: r.clickedAt?.toISOString() ?? null,
    })),
  });
});

campaignsRouter.patch("/campaigns/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const f of ["name", "subject", "body", "fromEmail", "segment"] as const) {
    if (req.body?.[f] !== undefined) updates[f] = req.body[f];
  }
  if (req.body?.scheduledAt !== undefined) updates.scheduledAt = req.body.scheduledAt ? new Date(req.body.scheduledAt) : null;
  const [c] = await db
    .update(campaignsTable)
    .set(updates)
    .where(and(eq(campaignsTable.id, id), eq(campaignsTable.organizationId, orgId)))
    .returning();
  if (!c) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }
  res.json(fmt(c));
});

campaignsRouter.post("/campaigns/:id/send", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  const [c] = await db
    .select()
    .from(campaignsTable)
    .where(and(eq(campaignsTable.id, id), eq(campaignsTable.organizationId, orgId)));
  if (!c) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }
  // Build recipient list from segment
  const entity = c.segment?.entity ?? "leads";
  const filters = c.segment?.filters ?? {};
  let recipients: { email: string; name: string; leadId: number | null; clientId: number | null }[] = [];
  if (entity === "leads") {
    const rows = await db.select().from(leadsTable).where(eq(leadsTable.organizationId, orgId));
    recipients = rows
      .filter((r) => (filters.status ? r.status === filters.status : true))
      .filter((r) => (filters.priority ? r.priority === filters.priority : true))
      .filter((r) => !!r.email)
      .map((r) => ({ email: r.email!, name: r.name, leadId: r.id, clientId: null }));
  } else {
    const rows = await db.select().from(clientsTable).where(eq(clientsTable.organizationId, orgId));
    recipients = rows
      .filter((r) => !!r.email)
      .map((r) => ({ email: r.email!, name: r.name, leadId: null, clientId: r.id }));
  }
  // Insert recipients + outbound email rows (status: sent in MVP)
  for (const r of recipients) {
    const [rec] = await db
      .insert(campaignRecipientsTable)
      .values({
        campaignId: id,
        organizationId: orgId,
        email: r.email,
        name: r.name,
        leadId: r.leadId,
        clientId: r.clientId,
        status: "sent",
        sentAt: new Date(),
      })
      .returning();
    await db.insert(emailsTable).values({
      organizationId: orgId,
      leadId: r.leadId,
      clientId: r.clientId,
      userId: req.user!.userId,
      direction: "outbound",
      fromEmail: c.fromEmail,
      toEmail: r.email,
      subject: c.subject,
      body: c.body,
      status: "sent",
      sentAt: new Date(),
      messageId: `<campaign-${id}-rec-${rec.id}@msme-pro>`,
    });
  }
  const [updated] = await db
    .update(campaignsTable)
    .set({
      status: "sent",
      sentAt: new Date(),
      stats: { total: recipients.length, sent: recipients.length, opened: 0, clicked: 0 },
      updatedAt: new Date(),
    })
    .where(eq(campaignsTable.id, id))
    .returning();
  await logAction(req, "SEND_CAMPAIGN", "campaign", id, `Sent to ${recipients.length}`);
  res.json(fmt(updated));
});

export default campaignsRouter;
