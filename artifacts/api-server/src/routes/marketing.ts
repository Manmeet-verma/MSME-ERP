import { Router } from "express";
import { getDb } from "../lib/firebase";
import crypto from "node:crypto";
import { requireAuth } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";

const db = () => getDb();

const marketingRouter = Router();

function fmtSuppression(s: Record<string, unknown>) {
  return {
    id: s.id as string,
    email: s.email as string,
    reason: s.reason as string,
    createdAt: s.createdAt as string,
  };
}

function fmtSequence(s: Record<string, unknown>, steps: Record<string, unknown>[] = []) {
  return {
    id: s.id as string,
    name: s.name as string,
    description: (s.description as string) ?? null,
    trigger: s.trigger as Record<string, unknown>,
    fromEmail: s.fromEmail as string,
    status: s.status as string,
    createdAt: s.createdAt as string,
    updatedAt: s.updatedAt as string,
    steps: steps
      .sort((a, b) => (a.stepOrder as number) - (b.stepOrder as number))
      .map((st) => ({
        id: st.id as string,
        stepOrder: st.stepOrder as number,
        delayDays: st.delayDays as number,
        subject: st.subject as string,
        body: st.body as string,
      })),
  };
}

// ── Suppressions ──
marketingRouter.get("/marketing/suppressions", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const snap = await db().collection("email_suppressions").where("organizationId", "==", orgId).get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  rows.sort((a, b) => ((b.createdAt as string) ?? "").localeCompare((a.createdAt as string) ?? ""));
  res.json(rows.map(fmtSuppression));
});

marketingRouter.post("/marketing/suppressions", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const { email, reason } = req.body ?? {};
  if (!email) {
    res.status(400).json({ error: "email required" });
    return;
  }
  const existingSnap = await db()
    .collection("email_suppressions")
    .where("organizationId", "==", orgId)
    .where("email", "==", email)
    .limit(1)
    .get();
  if (!existingSnap.empty) {
    const doc = existingSnap.docs[0];
    res.json(fmtSuppression({ id: doc.id, ...doc.data() }));
    return;
  }
  const ref = await db().collection("email_suppressions").add({
    organizationId: orgId,
    email,
    reason: reason ?? "manual",
    unsubscribeToken: crypto.randomBytes(16).toString("hex"),
    createdAt: new Date().toISOString(),
  });
  const snap = await ref.get();
  await logAction(req, "CREATE", "email_suppression", ref.id, email);
  res.status(201).json(fmtSuppression({ id: snap.id, ...snap.data() }));
});

marketingRouter.delete("/marketing/suppressions/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = req.params.id;
  const docSnap = await db().collection("email_suppressions").doc(id).get();
  if (docSnap.exists && docSnap.data()!.organizationId === orgId) {
    await docSnap.ref.delete();
  }
  res.json({ message: "Removed" });
});

// ── Drip sequences ──
marketingRouter.get("/marketing/drips", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const snap = await db().collection("drip_sequences").where("organizationId", "==", orgId).get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  rows.sort((a, b) => ((b.createdAt as string) ?? "").localeCompare((a.createdAt as string) ?? ""));
  let allSteps: Record<string, unknown>[] = [];
  if (rows.length) {
    const stepsSnap = await db().collection("drip_steps").get();
    allSteps = stepsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  const byId = new Map<string, Record<string, unknown>[]>();
  for (const s of allSteps) {
    const seqId = s.sequenceId as string;
    const arr = byId.get(seqId) ?? [];
    arr.push(s);
    byId.set(seqId, arr);
  }
  res.json(rows.map((r) => fmtSequence(r, byId.get(r.id as string) ?? [])));
});

marketingRouter.post("/marketing/drips", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const { name, description, trigger, fromEmail, steps } = req.body ?? {};
  if (!name || !trigger || !fromEmail) {
    res.status(400).json({ error: "name, trigger, fromEmail required" });
    return;
  }
  const seqRef = await db().collection("drip_sequences").add({
    organizationId: orgId,
    name,
    description: description ?? null,
    trigger,
    fromEmail,
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  if (Array.isArray(steps)) {
    for (const [i, step] of steps.entries()) {
      await db().collection("drip_steps").add({
        sequenceId: seqRef.id,
        stepOrder: i,
        delayDays: Number(step.delayDays ?? 0),
        subject: String(step.subject ?? ""),
        body: String(step.body ?? ""),
      });
    }
  }
  await logAction(req, "CREATE", "drip_sequence", seqRef.id);
  const stepsSnap = await db().collection("drip_steps").where("sequenceId", "==", seqRef.id).get();
  const stepRows = stepsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const seqSnap = await db().collection("drip_sequences").doc(seqRef.id).get();
  res.status(201).json(fmtSequence({ id: seqSnap.id, ...seqSnap.data() }, stepRows));
});

marketingRouter.patch("/marketing/drips/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = req.params.id;
  const seqSnap = await db().collection("drip_sequences").doc(id).get();
  if (!seqSnap.exists || seqSnap.data()!.organizationId !== orgId) {
    res.status(404).json({ error: "Sequence not found" });
    return;
  }
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  for (const f of ["name", "description", "trigger", "fromEmail", "status"] as const) {
    if (req.body?.[f] !== undefined) updates[f] = req.body[f];
  }
  await db().collection("drip_sequences").doc(id).update(updates);
  if (Array.isArray(req.body?.steps)) {
    const oldSteps = await db().collection("drip_steps").where("sequenceId", "==", id).get();
    for (const doc of oldSteps.docs) {
      await doc.ref.delete();
    }
    for (const [i, step] of (req.body.steps as Array<{ delayDays?: number; subject?: string; body?: string }>).entries()) {
      await db().collection("drip_steps").add({
        sequenceId: id,
        stepOrder: i,
        delayDays: Number(step.delayDays ?? 0),
        subject: String(step.subject ?? ""),
        body: String(step.body ?? ""),
      });
    }
  }
  const updatedSnap = await db().collection("drip_sequences").doc(id).get();
  const stepsSnap = await db().collection("drip_steps").where("sequenceId", "==", id).get();
  const stepRows = stepsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  res.json(fmtSequence({ id: updatedSnap.id, ...updatedSnap.data() }, stepRows));
});

marketingRouter.post("/marketing/drips/:id/enroll", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = req.params.id;
  const seqSnap = await db().collection("drip_sequences").doc(id).get();
  if (!seqSnap.exists || seqSnap.data()!.organizationId !== orgId) {
    res.status(404).json({ error: "Sequence not found" });
    return;
  }
  const seqData = seqSnap.data()!;
  const seqTrigger = (seqData.trigger as Record<string, unknown>) ?? {};
  const filters = ((seqTrigger as Record<string, unknown>).filters ?? {}) as Record<string, string>;
  let candidates: { email: string | null; name: string | null; leadId: string | null; clientId: string | null }[] = [];
  if ((seqTrigger as Record<string, unknown>).entity === "leads") {
    const leadsSnap = await db().collection("leads").where("organizationId", "==", orgId).get();
    candidates = leadsSnap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Record<string, unknown>))
      .filter((r) => (filters.status ? r.status === filters.status : true))
      .filter((r) => (filters.priority ? r.priority === filters.priority : true))
      .map((r) => ({ email: r.email as string | null, name: r.name as string | null, leadId: r.id as string, clientId: null }));
  } else {
    const clientsSnap = await db().collection("clients").where("organizationId", "==", orgId).get();
    candidates = clientsSnap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Record<string, unknown>))
      .map((r) => ({ email: r.email as string | null, name: r.name as string | null, leadId: null, clientId: r.id as string }));
  }
  let enrolled = 0;
  const now = new Date().toISOString();
  for (const c of candidates) {
    if (!c.email) continue;
    const existingSnap = await db()
      .collection("drip_enrollments")
      .where("sequenceId", "==", id)
      .where("email", "==", c.email)
      .limit(1)
      .get();
    if (!existingSnap.empty) continue;
    await db().collection("drip_enrollments").add({
      organizationId: orgId,
      sequenceId: id,
      leadId: c.leadId,
      clientId: c.clientId,
      email: c.email,
      name: c.name,
      currentStep: 0,
      status: "active",
      nextSendAt: now,
      createdAt: now,
      updatedAt: now,
    });
    enrolled += 1;
  }
  await db().collection("drip_sequences").doc(id).update({ status: "active", updatedAt: new Date().toISOString() });
  await logAction(req, "ENROLL", "drip_sequence", id, `Enrolled ${enrolled}`);
  res.json({ enrolled });
});

// Public unsubscribe — no auth, looked up by token
marketingRouter.get("/marketing/unsubscribe/:token", async (req, res) => {
  const snap = await db().collection("email_suppressions").where("unsubscribeToken", "==", req.params.token).limit(1).get();
  if (snap.empty) {
    res.status(404).json({ error: "Invalid unsubscribe link" });
    return;
  }
  const doc = snap.docs[0];
  const data = doc.data();
  res.json({ email: data.email, status: data.reason });
});

marketingRouter.post("/marketing/unsubscribe/:token", async (req, res) => {
  const snap = await db().collection("email_suppressions").where("unsubscribeToken", "==", req.params.token).limit(1).get();
  if (snap.empty) {
    res.status(404).json({ error: "Invalid unsubscribe link" });
    return;
  }
  const doc = snap.docs[0];
  const data = doc.data();
  await doc.ref.update({ reason: "unsubscribe" });
  // Stop all active drip enrollments for that email under same org.
  const enrollSnap = await db()
    .collection("drip_enrollments")
    .where("organizationId", "==", data.organizationId)
    .where("email", "==", data.email)
    .where("status", "==", "active")
    .get();
  for (const e of enrollSnap.docs) {
    await e.ref.update({ status: "stopped", updatedAt: new Date().toISOString() });
  }
  res.json({ message: "You have been unsubscribed." });
});

// Worker: run a drip tick
export async function tickDrips(): Promise<{ sent: number }> {
  const now = new Date().toISOString();
  const dueSnap = await db()
    .collection("drip_enrollments")
    .where("status", "==", "active")
    .where("nextSendAt", "<=", now)
    .get();
  let sent = 0;
  for (const enDoc of dueSnap.docs) {
    const en = enDoc.data();
    const seqSnap = await db().collection("drip_sequences").doc(en.sequenceId).get();
    if (!seqSnap.exists || seqSnap.data()!.status !== "active") continue;
    const stepsSnap = await db().collection("drip_steps").where("sequenceId", "==", en.sequenceId).get();
    const ordered = stepsSnap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Record<string, unknown>))
      .sort((a, b) => (a.stepOrder as number) - (b.stepOrder as number));
    const step = ordered[en.currentStep];
    if (!step) {
      await enDoc.ref.update({ status: "completed", updatedAt: new Date().toISOString() });
      continue;
    }
    // Suppression check
    const suppSnap = await db()
      .collection("email_suppressions")
      .where("organizationId", "==", en.organizationId)
      .where("email", "==", en.email)
      .limit(1)
      .get();
    if (!suppSnap.empty) {
      await enDoc.ref.update({ status: "stopped", updatedAt: new Date().toISOString() });
      continue;
    }
    const seqData = seqSnap.data()!;
    await db().collection("emails").add({
      organizationId: en.organizationId,
      leadId: en.leadId,
      clientId: en.clientId,
      direction: "outbound",
      fromEmail: seqData.fromEmail,
      toEmail: en.email,
      subject: step.subject,
      body: step.body,
      status: "sent",
      sentAt: new Date().toISOString(),
      messageId: `<drip-${en.sequenceId}-${enDoc.id}-step-${step.id}@msme-pro>`,
      createdAt: new Date().toISOString(),
    });
    sent += 1;
    const nextStep = en.currentStep + 1;
    const nextStepRow = ordered[nextStep];
    const nextDate = nextStepRow
      ? new Date(Date.now() + ((nextStepRow.delayDays as number) ?? 0) * 86400000).toISOString()
      : null;
    await enDoc.ref.update({
      currentStep: nextStep,
      status: nextStepRow ? "active" : "completed",
      nextSendAt: nextDate,
      updatedAt: new Date().toISOString(),
    });
  }
  return { sent };
}

export default marketingRouter;
