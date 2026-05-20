import { Router } from "express";
import { db, callsTable, leadsTable, leadActivitiesTable, usersTable } from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { getTwilioClient } from "../lib/twilio";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { logAction } from "../lib/auditLog";

const callsRouter = Router();

function fmt(c: typeof callsTable.$inferSelect, leadName: string | null, userName: string | null) {
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
    startedAt: c.startedAt?.toISOString() ?? null,
    endedAt: c.endedAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
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
  const leadIdQ = req.query.leadId ? Number(req.query.leadId) : null;
  const rows = await db
    .select({ c: callsTable, leadName: leadsTable.name, userName: usersTable.name })
    .from(callsTable)
    .leftJoin(leadsTable, eq(callsTable.leadId, leadsTable.id))
    .leftJoin(usersTable, eq(callsTable.userId, usersTable.id))
    .where(eq(callsTable.organizationId, orgId))
    .orderBy(desc(callsTable.createdAt));
  let result = rows.map((r) => fmt(r.c, r.leadName ?? null, r.userName ?? null));
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
  let status: typeof callsTable.$inferInsert["status"] = "queued";
  if (twilio) {
    try {
      // Call the agent first; once they pick up, TwiML dials the lead.
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
      const [c] = await db
        .insert(callsTable)
        .values({
          organizationId: orgId,
          leadId: leadId ?? null,
          userId: req.user!.userId,
          direction: "outbound",
          fromNumber: agent,
          toNumber: to,
          status,
          notes: `Twilio error: ${(e as Error).message}`,
        })
        .returning();
      res.status(502).json(fmt(c, null, null));
      return;
    }
  } else {
    status = "failed";
  }
  const [c] = await db
    .insert(callsTable)
    .values({
      organizationId: orgId,
      leadId: leadId ?? null,
      userId: req.user!.userId,
      direction: "outbound",
      fromNumber: agent,
      toNumber: to,
      status,
      twilioSid,
      startedAt: new Date(),
      notes: !twilio ? "Twilio integration not configured" : null,
    })
    .returning();
  if (leadId) {
    await db.insert(leadActivitiesTable).values({
      organizationId: orgId,
      leadId,
      type: "call",
      title: `Call initiated to ${to}`,
      userId: req.user!.userId,
    });
    await db
      .update(leadsTable)
      .set({ lastContactedAt: new Date() })
      .where(eq(leadsTable.id, leadId));
  }
  await logAction(req, "INITIATE_CALL", "call", c.id, twilio ? `Twilio SID ${twilioSid}` : "twilio unavailable");
  res.status(201).json(fmt(c, null, null));
});

callsRouter.patch("/calls/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  const updates: Record<string, unknown> = {};
  for (const f of ["notes", "transcript", "status"] as const) {
    if (req.body?.[f] !== undefined) updates[f] = req.body[f];
  }
  if (req.body?.durationSec !== undefined) {
    updates.durationSec = Number(req.body.durationSec);
    updates.endedAt = new Date();
  }
  const [c] = await db
    .update(callsTable)
    .set(updates)
    .where(and(eq(callsTable.id, id), eq(callsTable.organizationId, orgId)))
    .returning();
  if (!c) {
    res.status(404).json({ error: "Call not found" });
    return;
  }
  res.json(fmt(c, null, null));
});

callsRouter.post("/calls/:id/summarize", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  const [c] = await db
    .select()
    .from(callsTable)
    .where(and(eq(callsTable.id, id), eq(callsTable.organizationId, orgId)));
  if (!c) {
    res.status(404).json({ error: "Call not found" });
    return;
  }
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
    const [updated] = await db
      .update(callsTable)
      .set({ aiSummary: summary })
      .where(eq(callsTable.id, id))
      .returning();
    res.json(fmt(updated, null, null));
  } catch (e) {
    res.status(502).json({ error: "AI summary failed: " + (e as Error).message });
  }
});

export default callsRouter;
