import { Router } from "express";
import {
  db,
  emailSuppressionsTable,
  dripSequencesTable,
  dripStepsTable,
  dripEnrollmentsTable,
  leadsTable,
  clientsTable,
  emailsTable,
} from "@workspace/db";
import { and, eq, desc, lte } from "drizzle-orm";
import crypto from "node:crypto";
import { requireAuth } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";

const marketingRouter = Router();

function fmtSuppression(s: typeof emailSuppressionsTable.$inferSelect) {
  return {
    id: s.id,
    email: s.email,
    reason: s.reason,
    createdAt: s.createdAt.toISOString(),
  };
}

function fmtSequence(s: typeof dripSequencesTable.$inferSelect, steps: (typeof dripStepsTable.$inferSelect)[] = []) {
  return {
    id: s.id,
    name: s.name,
    description: s.description ?? null,
    trigger: s.trigger,
    fromEmail: s.fromEmail,
    status: s.status,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    steps: steps
      .sort((a, b) => a.stepOrder - b.stepOrder)
      .map((st) => ({
        id: st.id,
        stepOrder: st.stepOrder,
        delayDays: st.delayDays,
        subject: st.subject,
        body: st.body,
      })),
  };
}

// ── Suppressions ──
marketingRouter.get("/marketing/suppressions", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const rows = await db
    .select()
    .from(emailSuppressionsTable)
    .where(eq(emailSuppressionsTable.organizationId, orgId))
    .orderBy(desc(emailSuppressionsTable.createdAt));
  res.json(rows.map(fmtSuppression));
});

marketingRouter.post("/marketing/suppressions", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const { email, reason } = req.body ?? {};
  if (!email) {
    res.status(400).json({ error: "email required" });
    return;
  }
  const [existing] = await db
    .select()
    .from(emailSuppressionsTable)
    .where(and(eq(emailSuppressionsTable.organizationId, orgId), eq(emailSuppressionsTable.email, email)));
  if (existing) {
    res.json(fmtSuppression(existing));
    return;
  }
  const [row] = await db
    .insert(emailSuppressionsTable)
    .values({
      organizationId: orgId,
      email,
      reason: reason ?? "manual",
      unsubscribeToken: crypto.randomBytes(16).toString("hex"),
    })
    .returning();
  await logAction(req, "CREATE", "email_suppression", row.id, email);
  res.status(201).json(fmtSuppression(row));
});

marketingRouter.delete("/marketing/suppressions/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  await db
    .delete(emailSuppressionsTable)
    .where(and(eq(emailSuppressionsTable.id, id), eq(emailSuppressionsTable.organizationId, orgId)));
  res.json({ message: "Removed" });
});

// ── Drip sequences ──
marketingRouter.get("/marketing/drips", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const rows = await db
    .select()
    .from(dripSequencesTable)
    .where(eq(dripSequencesTable.organizationId, orgId))
    .orderBy(desc(dripSequencesTable.createdAt));
  const allSteps = rows.length
    ? await db.select().from(dripStepsTable)
    : [];
  const byId = new Map<number, (typeof allSteps)>();
  for (const s of allSteps) {
    const arr = byId.get(s.sequenceId) ?? [];
    arr.push(s);
    byId.set(s.sequenceId, arr);
  }
  res.json(rows.map((r) => fmtSequence(r, byId.get(r.id) ?? [])));
});

marketingRouter.post("/marketing/drips", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const { name, description, trigger, fromEmail, steps } = req.body ?? {};
  if (!name || !trigger || !fromEmail) {
    res.status(400).json({ error: "name, trigger, fromEmail required" });
    return;
  }
  const [seq] = await db
    .insert(dripSequencesTable)
    .values({
      organizationId: orgId,
      name,
      description: description ?? null,
      trigger,
      fromEmail,
      status: "draft",
    })
    .returning();
  if (Array.isArray(steps)) {
    for (const [i, step] of steps.entries()) {
      await db.insert(dripStepsTable).values({
        sequenceId: seq.id,
        stepOrder: i,
        delayDays: Number(step.delayDays ?? 0),
        subject: String(step.subject ?? ""),
        body: String(step.body ?? ""),
      });
    }
  }
  await logAction(req, "CREATE", "drip_sequence", seq.id);
  const stepRows = await db.select().from(dripStepsTable).where(eq(dripStepsTable.sequenceId, seq.id));
  res.status(201).json(fmtSequence(seq, stepRows));
});

marketingRouter.patch("/marketing/drips/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  const [seq] = await db
    .select()
    .from(dripSequencesTable)
    .where(and(eq(dripSequencesTable.id, id), eq(dripSequencesTable.organizationId, orgId)));
  if (!seq) {
    res.status(404).json({ error: "Sequence not found" });
    return;
  }
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const f of ["name", "description", "trigger", "fromEmail", "status"] as const) {
    if (req.body?.[f] !== undefined) updates[f] = req.body[f];
  }
  const [updated] = await db
    .update(dripSequencesTable)
    .set(updates)
    .where(eq(dripSequencesTable.id, id))
    .returning();
  if (Array.isArray(req.body?.steps)) {
    await db.delete(dripStepsTable).where(eq(dripStepsTable.sequenceId, id));
    for (const [i, step] of (req.body.steps as Array<{ delayDays?: number; subject?: string; body?: string }>).entries()) {
      await db.insert(dripStepsTable).values({
        sequenceId: id,
        stepOrder: i,
        delayDays: Number(step.delayDays ?? 0),
        subject: String(step.subject ?? ""),
        body: String(step.body ?? ""),
      });
    }
  }
  const stepRows = await db.select().from(dripStepsTable).where(eq(dripStepsTable.sequenceId, id));
  res.json(fmtSequence(updated, stepRows));
});

marketingRouter.post("/marketing/drips/:id/enroll", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  const [seq] = await db
    .select()
    .from(dripSequencesTable)
    .where(and(eq(dripSequencesTable.id, id), eq(dripSequencesTable.organizationId, orgId)));
  if (!seq) {
    res.status(404).json({ error: "Sequence not found" });
    return;
  }
  // Enroll all matching leads/clients per trigger
  const filters = (seq.trigger?.filters ?? {}) as Record<string, string>;
  let candidates: { email: string | null; name: string | null; leadId: number | null; clientId: number | null }[] = [];
  if (seq.trigger.entity === "leads") {
    const rows = await db.select().from(leadsTable).where(eq(leadsTable.organizationId, orgId));
    candidates = rows
      .filter((r) => (filters.status ? r.status === filters.status : true))
      .filter((r) => (filters.priority ? r.priority === filters.priority : true))
      .map((r) => ({ email: r.email, name: r.name, leadId: r.id, clientId: null }));
  } else {
    const rows = await db.select().from(clientsTable).where(eq(clientsTable.organizationId, orgId));
    candidates = rows.map((r) => ({ email: r.email, name: r.name, leadId: null, clientId: r.id }));
  }
  let enrolled = 0;
  const now = new Date();
  for (const c of candidates) {
    if (!c.email) continue;
    const [existing] = await db
      .select()
      .from(dripEnrollmentsTable)
      .where(and(eq(dripEnrollmentsTable.sequenceId, id), eq(dripEnrollmentsTable.email, c.email)));
    if (existing) continue;
    await db.insert(dripEnrollmentsTable).values({
      organizationId: orgId,
      sequenceId: id,
      leadId: c.leadId,
      clientId: c.clientId,
      email: c.email,
      name: c.name,
      currentStep: 0,
      status: "active",
      nextSendAt: now,
    });
    enrolled += 1;
  }
  await db
    .update(dripSequencesTable)
    .set({ status: "active", updatedAt: new Date() })
    .where(eq(dripSequencesTable.id, id));
  await logAction(req, "ENROLL", "drip_sequence", id, `Enrolled ${enrolled}`);
  res.json({ enrolled });
});

// Public unsubscribe — no auth, looked up by token
marketingRouter.get("/marketing/unsubscribe/:token", async (req, res) => {
  const [row] = await db
    .select()
    .from(emailSuppressionsTable)
    .where(eq(emailSuppressionsTable.unsubscribeToken, req.params.token));
  if (!row) {
    res.status(404).json({ error: "Invalid unsubscribe link" });
    return;
  }
  res.json({ email: row.email, status: row.reason });
});

marketingRouter.post("/marketing/unsubscribe/:token", async (req, res) => {
  const [row] = await db
    .select()
    .from(emailSuppressionsTable)
    .where(eq(emailSuppressionsTable.unsubscribeToken, req.params.token));
  if (!row) {
    res.status(404).json({ error: "Invalid unsubscribe link" });
    return;
  }
  await db
    .update(emailSuppressionsTable)
    .set({ reason: "unsubscribe" })
    .where(eq(emailSuppressionsTable.id, row.id));
  // Stop all active drip enrollments for that email under same org.
  await db
    .update(dripEnrollmentsTable)
    .set({ status: "stopped", updatedAt: new Date() })
    .where(
      and(
        eq(dripEnrollmentsTable.organizationId, row.organizationId),
        eq(dripEnrollmentsTable.email, row.email),
        eq(dripEnrollmentsTable.status, "active"),
      ),
    );
  res.json({ message: "You have been unsubscribed." });
});

// Worker: run a drip tick — sends the next step for any active enrollment whose nextSendAt has passed.
export async function tickDrips(): Promise<{ sent: number }> {
  const due = await db
    .select()
    .from(dripEnrollmentsTable)
    .where(
      and(
        eq(dripEnrollmentsTable.status, "active"),
        lte(dripEnrollmentsTable.nextSendAt, new Date()),
      ),
    );
  let sent = 0;
  for (const en of due) {
    const [seq] = await db.select().from(dripSequencesTable).where(eq(dripSequencesTable.id, en.sequenceId));
    if (!seq || seq.status !== "active") continue;
    const steps = await db.select().from(dripStepsTable).where(eq(dripStepsTable.sequenceId, en.sequenceId));
    const ordered = steps.sort((a, b) => a.stepOrder - b.stepOrder);
    const step = ordered[en.currentStep];
    if (!step) {
      await db
        .update(dripEnrollmentsTable)
        .set({ status: "completed", updatedAt: new Date() })
        .where(eq(dripEnrollmentsTable.id, en.id));
      continue;
    }
    // Suppression check
    const [supp] = await db
      .select()
      .from(emailSuppressionsTable)
      .where(
        and(
          eq(emailSuppressionsTable.organizationId, en.organizationId),
          eq(emailSuppressionsTable.email, en.email),
        ),
      );
    if (supp) {
      await db
        .update(dripEnrollmentsTable)
        .set({ status: "stopped", updatedAt: new Date() })
        .where(eq(dripEnrollmentsTable.id, en.id));
      continue;
    }
    await db.insert(emailsTable).values({
      organizationId: en.organizationId,
      leadId: en.leadId,
      clientId: en.clientId,
      direction: "outbound",
      fromEmail: seq.fromEmail,
      toEmail: en.email,
      subject: step.subject,
      body: step.body,
      status: "sent",
      sentAt: new Date(),
      messageId: `<drip-${seq.id}-${en.id}-step-${step.id}@msme-pro>`,
    });
    sent += 1;
    const nextStep = en.currentStep + 1;
    const nextStepRow = ordered[nextStep];
    const nextDate = nextStepRow
      ? new Date(Date.now() + (nextStepRow.delayDays ?? 0) * 86400000)
      : null;
    await db
      .update(dripEnrollmentsTable)
      .set({
        currentStep: nextStep,
        status: nextStepRow ? "active" : "completed",
        nextSendAt: nextDate,
        updatedAt: new Date(),
      })
      .where(eq(dripEnrollmentsTable.id, en.id));
  }
  return { sent };
}

export default marketingRouter;
