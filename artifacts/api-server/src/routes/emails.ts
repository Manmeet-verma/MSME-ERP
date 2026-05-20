import { Router } from "express";
import { db, emailsTable, leadsTable, clientsTable, leadActivitiesTable } from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { logAction } from "../lib/auditLog";

const emailsRouter = Router();

function fmt(e: typeof emailsTable.$inferSelect) {
  return {
    id: e.id,
    leadId: e.leadId ?? null,
    clientId: e.clientId ?? null,
    direction: e.direction,
    fromEmail: e.fromEmail,
    toEmail: e.toEmail,
    subject: e.subject,
    body: e.body,
    status: e.status,
    threadId: e.threadId ?? null,
    openedAt: e.openedAt?.toISOString() ?? null,
    clickedAt: e.clickedAt?.toISOString() ?? null,
    sentAt: e.sentAt?.toISOString() ?? null,
    createdAt: e.createdAt.toISOString(),
  };
}

emailsRouter.get("/emails", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const leadId = req.query.leadId ? Number(req.query.leadId) : null;
  const clientId = req.query.clientId ? Number(req.query.clientId) : null;
  let rows = await db
    .select()
    .from(emailsTable)
    .where(eq(emailsTable.organizationId, orgId))
    .orderBy(desc(emailsTable.createdAt));
  if (leadId) rows = rows.filter((r) => r.leadId === leadId);
  if (clientId) rows = rows.filter((r) => r.clientId === clientId);
  res.json(rows.map(fmt));
});

emailsRouter.post("/emails", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const { toEmail, subject, body, leadId, clientId, threadId } = req.body ?? {};
  if (!toEmail || !subject || !body) {
    res.status(400).json({ error: "toEmail, subject, body required" });
    return;
  }
  // For MVP we just record the email; real SMTP would send here.
  // If SMTP integration exists, status=sent; else queued.
  const fromEmail = req.user!.email;
  const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@msme-pro>`;
  const [e] = await db
    .insert(emailsTable)
    .values({
      organizationId: orgId,
      leadId: leadId ?? null,
      clientId: clientId ?? null,
      userId: req.user!.userId,
      direction: "outbound",
      fromEmail,
      toEmail,
      subject,
      body,
      status: "sent",
      messageId,
      threadId: threadId ?? messageId,
      sentAt: new Date(),
    })
    .returning();
  if (leadId) {
    await db.insert(leadActivitiesTable).values({
      organizationId: orgId,
      leadId,
      type: "email",
      title: `Sent: ${subject}`,
      body,
      userId: req.user!.userId,
    });
    await db.update(leadsTable).set({ lastContactedAt: new Date() }).where(eq(leadsTable.id, leadId));
  }
  await logAction(req, "SEND_EMAIL", "email", e.id, `To ${toEmail}`);
  res.status(201).json(fmt(e));
});

emailsRouter.post("/emails/draft", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const { purpose, leadId, clientId, tone } = req.body ?? {};
  if (!purpose) {
    res.status(400).json({ error: "purpose required" });
    return;
  }
  let context = "";
  if (leadId) {
    const [l] = await db
      .select()
      .from(leadsTable)
      .where(and(eq(leadsTable.id, Number(leadId)), eq(leadsTable.organizationId, orgId)));
    if (l) context = `Recipient is a lead: ${l.name}${l.company ? " from " + l.company : ""}. Source: ${l.source}. Product interest: ${l.product ?? "unspecified"}.`;
  } else if (clientId) {
    const [c] = await db
      .select()
      .from(clientsTable)
      .where(and(eq(clientsTable.id, Number(clientId)), eq(clientsTable.organizationId, orgId)));
    if (c) context = `Recipient is a client: ${c.name}${c.company ? " from " + c.company : ""}.`;
  }
  const toneText = tone ?? "friendly";
  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: `You are an Indian MSME sales rep. Draft a ${toneText} business email in English. Keep it under 150 words. Return as JSON with keys "subject" and "body" only (no markdown fences).\n\nContext: ${context}\n\nPurpose: ${purpose}`,
        },
      ],
    });
    const text = msg.content[0]?.type === "text" ? msg.content[0].text : "";
    let subject = "Following up";
    let body = text;
    try {
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
        if (parsed.subject) subject = parsed.subject;
        if (parsed.body) body = parsed.body;
      }
    } catch {
      // fall through
    }
    res.json({ subject, body });
  } catch (e) {
    res.status(502).json({ error: "AI draft failed: " + (e as Error).message });
  }
});

emailsRouter.get("/emails/track/open/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (id) {
    await db
      .update(emailsTable)
      .set({ status: "opened", openedAt: new Date() })
      .where(and(eq(emailsTable.id, id), eq(emailsTable.openedAt, null as never)));
  }
  // 1x1 transparent gif
  const gif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
  res.setHeader("Content-Type", "image/gif");
  res.setHeader("Cache-Control", "no-store");
  res.end(gif);
});

export default emailsRouter;
