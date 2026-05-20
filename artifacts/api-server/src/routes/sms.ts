import { Router } from "express";
import { db, quotationsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";
import { getTwilioClient } from "../lib/twilio";

const smsRouter = Router();

smsRouter.post("/quotations/:id/send-sms", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  const { phone, message } = req.body ?? {};
  if (!phone || !message) {
    res.status(400).json({ error: "phone and message are required" });
    return;
  }
  const twilio = await getTwilioClient();
  if (!twilio || !twilio.fromNumber) {
    res
      .status(503)
      .json({ error: "SMS service not configured. Please connect Twilio in the integrations panel." });
    return;
  }
  const [q] = await db
    .select()
    .from(quotationsTable)
    .where(and(eq(quotationsTable.id, id), eq(quotationsTable.organizationId, orgId)));
  if (!q) {
    res.status(404).json({ error: "Quotation not found" });
    return;
  }
  let toNumber = String(phone).trim();
  if (toNumber.startsWith("0")) toNumber = "+91" + toNumber.slice(1);
  else if (/^\d{10}$/.test(toNumber)) toNumber = "+91" + toNumber;
  else if (!toNumber.startsWith("+")) toNumber = "+91" + toNumber;
  try {
    await twilio.client.messages.create({ body: message, from: twilio.fromNumber, to: toNumber });
    await logAction(req, "SEND_SMS", "quotation", id, `SMS sent to ${toNumber}`);
    res.json({ message: "SMS sent successfully" });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to send SMS";
    req.log.error({ err }, "Twilio SMS error");
    res.status(500).json({ error: errorMessage });
  }
});

export default smsRouter;
