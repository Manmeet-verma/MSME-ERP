import { Router } from "express";
import { getDb } from "../lib/firebase";
import { requireAuth } from "../middlewares/auth";
import { anthropic } from "../lib/integrations-anthropic-ai";
import { logAction } from "../lib/auditLog";

const db = () => getDb();

const emailsRouter = Router();

function fmt(e: Record<string, any>) {
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
    openedAt: e.openedAt ?? null,
    clickedAt: e.clickedAt ?? null,
    sentAt: e.sentAt ?? null,
    createdAt: e.createdAt ?? new Date().toISOString(),
  };
}

emailsRouter.get("/emails", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const leadId = req.query.leadId ? String(req.query.leadId) : null;
  const clientId = req.query.clientId ? String(req.query.clientId) : null;
  const snap = await db().collection("emails").where("organizationId", "==", orgId).get();
  let rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  rows.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
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
  const fromEmail = req.user!.email;
  const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@msme-pro>`;
  const now = new Date().toISOString();
  const docRef = await db().collection("emails").add({
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
    sentAt: now,
    createdAt: now,
  });
  if (leadId) {
    await db().collection("lead_activities").add({
      organizationId: orgId,
      leadId,
      type: "email",
      title: `Sent: ${subject}`,
      body,
      userId: req.user!.userId,
      createdAt: new Date().toISOString(),
    });
    await db().collection("leads").doc(leadId).update({
      lastContactedAt: new Date().toISOString(),
    });
  }
  await logAction(req, "SEND_EMAIL", "email", docRef.id, `To ${toEmail}`);
  res.status(201).json(fmt({ id: docRef.id, fromEmail, toEmail, subject, body, status: "sent", messageId, threadId: threadId ?? messageId, sentAt: now, createdAt: now, leadId: leadId ?? null, clientId: clientId ?? null, direction: "outbound" }));
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
    const leadSnap = await db().collection("leads").doc(String(leadId)).get();
    if (leadSnap.exists) {
      const l = leadSnap.data()!;
      if (l.organizationId === orgId) {
        context = `Recipient is a lead: ${l.name}${l.company ? " from " + l.company : ""}. Source: ${l.source}. Product interest: ${l.product ?? "unspecified"}.`;
      }
    }
  } else if (clientId) {
    const clientSnap = await db().collection("clients").doc(String(clientId)).get();
    if (clientSnap.exists) {
      const c = clientSnap.data()!;
      if (c.organizationId === orgId) {
        context = `Recipient is a client: ${c.name}${c.company ? " from " + c.company : ""}.`;
      }
    }
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
    let bodyText = text;
    try {
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
        if (parsed.subject) subject = parsed.subject;
        if (parsed.body) bodyText = parsed.body;
      }
    } catch {
      // fall through
    }
    res.json({ subject, body: bodyText });
  } catch (e) {
    res.status(502).json({ error: "AI draft failed: " + (e as Error).message });
  }
});

emailsRouter.get("/emails/track/open/:id", async (req, res) => {
  const id = req.params.id;
  if (id) {
    const snap = await db().collection("emails").doc(id).get();
    if (snap.exists && !snap.data()!.openedAt) {
      await db().collection("emails").doc(id).update({
        status: "opened",
        openedAt: new Date().toISOString(),
      });
    }
  }
  const gif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
  res.setHeader("Content-Type", "image/gif");
  res.setHeader("Cache-Control", "no-store");
  res.end(gif);
});

export default emailsRouter;
