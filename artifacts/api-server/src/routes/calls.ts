import { Router } from "express";
import { getDb } from "../lib/firebase";
import { requireAuth } from "../middlewares/auth";
import { getTwilioClient } from "../lib/twilio";
import { anthropic } from "../lib/integrations-anthropic-ai";
import { logAction } from "../lib/auditLog";

const db = () => getDb();

const callsRouter = Router();

function fmt(c: Record<string, any>, leadName: string | null, userName: string | null) {
  return {
    id: c.id,
    leadId: c.leadId ?? null,
    leadName,
    userId: c.userId ?? null,
    userName,
    direction: c.direction,
    fromNumber: c.fromNumber ?? null,
    toNumber: c.toNumber,
    status: c.status,
    twilioSid: c.twilioSid ?? null,
    durationSec: c.durationSec ?? null,
    recordingUrl: c.recordingUrl ?? null,
    transcript: c.transcript ?? null,
    aiSummary: c.aiSummary ?? null,
    notes: c.notes ?? null,
    startedAt: c.startedAt ?? null,
    endedAt: c.endedAt ?? null,
    createdAt: c.createdAt ?? new Date().toISOString(),
  };
}

function normalizePhone(p: string): string {
  let n = p.replace(/[^\d+]/g, "");
  if (n.startsWith("0")) n = n.slice(1);
  if (!n.startsWith("+")) n = "+91" + n;
  return n;
}

callsRouter.get("/calls", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const leadIdQ = req.query.leadId ? String(req.query.leadId) : null;
  const snap = await db().collection("calls").where("organizationId", "==", orgId).get();
  let rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  rows.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  // Fetch lead and user names
  const leadIds = [...new Set(rows.map((r) => r.leadId).filter(Boolean))];
  const userIds = [...new Set(rows.map((r) => r.userId).filter(Boolean))];
  const leadMap: Record<string, string> = {};
  const userMap: Record<string, string> = {};
  for (const lid of leadIds) {
    const leadSnap = await db().collection("leads").doc(lid).get();
    if (leadSnap.exists) leadMap[lid] = leadSnap.data()!.name;
  }
  for (const uid of userIds) {
    const userSnap = await db().collection("users").doc(uid).get();
    if (userSnap.exists) userMap[uid] = userSnap.data()!.name;
  }
  let result = rows.map((r) => fmt(r, r.leadId ? leadMap[r.leadId] ?? null : null, r.userId ? userMap[r.userId] ?? null : null));
  if (leadIdQ) result = result.filter((c) => c.leadId === leadIdQ);
  res.json(result);
});

callsRouter.post("/calls/initiate", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const { toNumber, agentNumber, leadId } = req.body ?? {};
  if (!toNumber || !agentNumber) {
    res.status(400).json({ error: "toNumber and agentNumber required" });
    return;
  }
  const to = normalizePhone(toNumber);
  const agent = normalizePhone(agentNumber);
  const twilio = await getTwilioClient();
  let twilioSid: string | null = null;
  let status = "queued";
  if (twilio) {
    try {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Connecting you to your customer.</Say><Dial>${to}</Dial></Response>`;
      const call = await twilio.client.calls.create({
        from: twilio.fromNumber,
        to: agent,
        twiml,
      });
      twilioSid = call.sid;
      status = "ringing";
    } catch (e) {
      status = "failed";
      const docRef = await db().collection("calls").add({
        organizationId: orgId,
        leadId: leadId ?? null,
        userId: req.user!.userId,
        direction: "outbound",
        fromNumber: agent,
        toNumber: to,
        status,
        notes: `Twilio error: ${(e as Error).message}`,
        createdAt: new Date().toISOString(),
      });
      res.status(502).json(fmt({ id: docRef.id, status }, null, null));
      return;
    }
  } else {
    status = "failed";
  }
  const now = new Date().toISOString();
  const docRef = await db().collection("calls").add({
    organizationId: orgId,
    leadId: leadId ?? null,
    userId: req.user!.userId,
    direction: "outbound",
    fromNumber: agent,
    toNumber: to,
    status,
    twilioSid,
    startedAt: now,
    notes: !twilio ? "Twilio integration not configured" : null,
    createdAt: now,
  });
  if (leadId) {
    await db().collection("lead_activities").add({
      organizationId: orgId,
      leadId,
      type: "call",
      title: `Call initiated to ${to}`,
      userId: req.user!.userId,
      createdAt: new Date().toISOString(),
    });
    await db().collection("leads").doc(leadId).update({
      lastContactedAt: new Date().toISOString(),
    });
  }
  await logAction(req, "INITIATE_CALL", "call", docRef.id, twilio ? `Twilio SID ${twilioSid}` : "twilio unavailable");
  res.status(201).json(fmt({ id: docRef.id, startedAt: now, status }, null, null));
});

callsRouter.patch("/calls/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = req.params.id;
  const existingSnap = await db().collection("calls").doc(id).get();
  if (!existingSnap.exists || existingSnap.data()!.organizationId !== orgId) {
    res.status(404).json({ error: "Call not found" });
    return;
  }
  const updates: Record<string, unknown> = {};
  for (const f of ["notes", "transcript", "status"] as const) {
    if (req.body?.[f] !== undefined) updates[f] = req.body[f];
  }
  if (req.body?.durationSec !== undefined) {
    updates.durationSec = Number(req.body.durationSec);
    updates.endedAt = new Date().toISOString();
  }
  await db().collection("calls").doc(id).update(updates);
  const updatedSnap = await db().collection("calls").doc(id).get();
  const c = { id: updatedSnap.id, ...updatedSnap.data() };
  res.json(fmt(c, null, null));
});

callsRouter.post("/calls/:id/summarize", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = req.params.id;
  const snap = await db().collection("calls").doc(id).get();
  if (!snap.exists || snap.data()!.organizationId !== orgId) {
    res.status(404).json({ error: "Call not found" });
    return;
  }
  const c = snap.data()!;
  const transcript = c.transcript || c.notes;
  if (!transcript) {
    res.status(400).json({ error: "No transcript or notes to summarize" });
    return;
  }
  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: `Summarize this sales call in 3 short bullet points (key topic, customer interest, next step). Transcript:\n\n${transcript}`,
        },
      ],
    });
    const summary = msg.content[0]?.type === "text" ? msg.content[0].text : "";
    await db().collection("calls").doc(id).update({ aiSummary: summary });
    const updatedSnap = await db().collection("calls").doc(id).get();
    const updated = { id: updatedSnap.id, ...updatedSnap.data() };
    res.json(fmt(updated, null, null));
  } catch (e) {
    res.status(502).json({ error: "AI summary failed: " + (e as Error).message });
  }
});

export default callsRouter;
