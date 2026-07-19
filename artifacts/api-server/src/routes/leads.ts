import { Router } from "express";
import { getDb } from "../lib/firebase";
import { requireAuth } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";
import { scoreLead } from "../lib/leadScoring";

const db = () => getDb();

const leadsRouter = Router();

function formatLead(id: string, l: Record<string, any>) {
  return {
    id,
    name: l.name,
    email: l.email ?? null,
    phone: l.phone ?? null,
    gstin: l.gstin ?? null,
    company: l.company ?? null,
    city: l.city ?? null,
    state: l.state ?? null,
    source: l.source ?? "manual",
    sourceBy: l.sourceBy ?? null,
    externalId: l.externalId ?? null,
    status: l.status ?? "new",
    priority: l.priority ?? "medium",
    score: l.score ?? 0,
    approxBudget: l.approxBudget ?? l.budget ?? null,
    budget: l.budget !== null && l.budget !== undefined ? Number(l.budget) : null,
    product: l.product ?? null,
    notes: l.notes ?? null,
    nextAction: l.nextAction ?? null,
    assignedToId: l.assignedToId ?? null,
    convertedClientId: l.convertedClientId ?? null,
    lastContactedAt: l.lastContactedAt ?? null,
    createdAt: l.createdAt ?? new Date().toISOString(),
    updatedAt: l.updatedAt ?? new Date().toISOString(),
  };
}

leadsRouter.get("/leads", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const { status, priority, source, search, page: pageStr, limit: limitStr } = req.query as Record<string, string | undefined>;
  const pageSize = Math.min(Number(limitStr) || 50, 100);
  const pageNum = Math.max(Number(pageStr) || 1, 1);
  const snap = await db().collection("leads").where("organizationId", "==", orgId).get();
  let rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  rows.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  if (status) rows = rows.filter((r) => r.status === status);
  if (priority) rows = rows.filter((r) => r.priority === priority);
  if (source) rows = rows.filter((r) => r.source === source);
  if (search) {
    const s = search.toLowerCase();
    rows = rows.filter(
      (r) =>
        (r.name ?? "").toLowerCase().includes(s) ||
        (r.email ?? "").toLowerCase().includes(s) ||
        (r.company ?? "").toLowerCase().includes(s) ||
        (r.phone ?? "").includes(s) ||
        (r.gstin ?? "").toLowerCase().includes(s) ||
        (r.sourceBy ?? "").toLowerCase().includes(s),
    );
  }
  const total = rows.length;
  const totalPages = Math.ceil(total / pageSize);
  const paged = rows.slice((pageNum - 1) * pageSize, pageNum * pageSize);
  res.json({ data: paged.map((r) => formatLead(r.id, r)), total, totalPages, page: pageNum });
});

leadsRouter.post("/leads", requireAuth, async (req, res) => {
  try {
    const orgId = req.user!.organizationId;
    const body = req.body ?? {};
    if (!body.name && !body.phone) {
      res.status(400).json({ error: "name or phone required" });
      return;
    }
    const displayName = body.name || body.phone || "Unknown Lead";
    const now = new Date().toISOString();
    const initial = {
      organizationId: orgId,
      name: displayName,
      email: body.email ?? null,
      phone: body.phone ?? null,
      gstin: body.gstin ?? null,
      company: body.company ?? null,
      city: body.city ?? null,
      state: body.state ?? null,
      source: body.source ?? "manual",
      sourceBy: body.sourceBy ?? null,
      status: body.status ?? "new",
      budget: body.budget !== undefined && body.budget !== null ? String(body.budget) : null,
      approxBudget: body.approxBudget ?? null,
      product: body.product ?? null,
      notes: body.notes ?? null,
      assignedToId: body.assignedToId ?? null,
      createdById: req.user!.userId,
      createdAt: now,
      updatedAt: now,
    };
    const sc = scoreLead({
      ...initial,
      budget: initial.budget ? Number(initial.budget) : null,
    } as never);
    const docRef = await db().collection("leads").add({
      ...initial,
      priority: sc.priority,
      score: sc.score,
      nextAction: sc.nextAction,
    });
    const lead = { id: docRef.id, ...initial, priority: sc.priority, score: sc.score, nextAction: sc.nextAction };
    await db().collection("lead_activities").add({
      organizationId: orgId,
      leadId: docRef.id,
      type: "note",
      title: "Lead created",
      body: `Source: ${lead.source}`,
      userId: req.user!.userId,
      createdAt: new Date().toISOString(),
    });
    await logAction(req, "CREATE", "lead", docRef.id, `Created lead ${lead.name}`);
    res.status(201).json(formatLead(docRef.id, lead));
  } catch (err: any) {
    console.error("POST /leads error:", err);
    res.status(500).json({ error: err.message ?? "Failed to create lead" });
  }
});

leadsRouter.get("/leads/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = req.params.id;
  const snap = await db().collection("leads").doc(id).get();
  if (!snap.exists || snap.data()!.organizationId !== orgId) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }
  const l = snap.data()!;
  const actSnap = await db().collection("lead_activities").where("leadId", "==", id).get();
  const acts = actSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  acts.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  const userIds = [...new Set(acts.map((a) => a.userId).filter(Boolean))];
  const userMap: Record<string, string> = {};
  for (const uid of userIds) {
    const userSnap = await db().collection("users").doc(uid).get();
    if (userSnap.exists) {
      userMap[uid] = userSnap.data()!.name;
    }
  }
  res.json({
    ...formatLead(id, l),
    activities: acts.map((a) => ({
      id: a.id,
      leadId: a.leadId,
      type: a.type,
      title: a.title,
      body: a.body ?? null,
      userId: a.userId ?? null,
      userName: a.userId ? userMap[a.userId] ?? null : null,
      createdAt: a.createdAt ?? new Date().toISOString(),
    })),
  });
});

leadsRouter.patch("/leads/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = req.params.id;
  const existingSnap = await db().collection("leads").doc(id).get();
  if (!existingSnap.exists || existingSnap.data()!.organizationId !== orgId) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  const body = req.body ?? {};
  for (const f of [
    "name", "email", "phone", "gstin", "company", "city", "state",
    "source", "sourceBy", "status", "product", "notes", "nextAction", "assignedToId",
  ] as const) {
    if (body[f] !== undefined) updates[f] = body[f];
  }
  if (body.budget !== undefined) updates.budget = body.budget !== null ? String(body.budget) : null;
  if (body.approxBudget !== undefined) updates.approxBudget = body.approxBudget;
  if (body.priority) updates.priority = body.priority;
  if (body.status && body.status !== "new") updates.lastContactedAt = new Date().toISOString();
  await db().collection("leads").doc(id).update(updates);
  const updatedSnap = await db().collection("leads").doc(id).get();
  const l = { id: updatedSnap.id, ...updatedSnap.data() };
  const sc = scoreLead({ ...l, budget: l.budget ? Number(l.budget) : null } as never);
  await db().collection("leads").doc(id).update({
    priority: sc.priority,
    score: sc.score,
    nextAction: sc.nextAction,
  });
  const finalSnap = await db().collection("leads").doc(id).get();
  const final = { id: finalSnap.id, ...finalSnap.data() };
  await logAction(req, "UPDATE", "lead", id);
  res.json(formatLead(id, final));
});

leadsRouter.delete("/leads/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = req.params.id;
  const snap = await db().collection("leads").doc(id).get();
  if (!snap.exists || snap.data()!.organizationId !== orgId) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }
  await db().collection("leads").doc(id).delete();
  await logAction(req, "DELETE", "lead", id);
  res.json({ message: "Lead deleted" });
});

leadsRouter.get("/leads/:id/activities", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = req.params.id;
  const leadSnap = await db().collection("leads").doc(id).get();
  if (!leadSnap.exists || leadSnap.data()!.organizationId !== orgId) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }
  const actSnap = await db().collection("lead_activities").where("leadId", "==", id).get();
  const acts = actSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  acts.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  const userIds = [...new Set(acts.map((a) => a.userId).filter(Boolean))];
  const userMap: Record<string, string> = {};
  for (const uid of userIds) {
    const userSnap = await db().collection("users").doc(uid).get();
    if (userSnap.exists) {
      userMap[uid] = userSnap.data()!.name;
    }
  }
  res.json(
    acts.map((a) => ({
      id: a.id,
      leadId: a.leadId,
      type: a.type,
      title: a.title,
      body: a.body ?? null,
      userId: a.userId ?? null,
      userName: a.userId ? userMap[a.userId] ?? null : null,
      createdAt: a.createdAt ?? new Date().toISOString(),
    })),
  );
});

leadsRouter.post("/leads/:id/activities", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = req.params.id;
  const leadSnap = await db().collection("leads").doc(id).get();
  if (!leadSnap.exists || leadSnap.data()!.organizationId !== orgId) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }
  const l = leadSnap.data()!;
  const { type, title, body } = req.body ?? {};
  if (!type || !title) {
    res.status(400).json({ error: "type and title required" });
    return;
  }
  const actRef = await db().collection("lead_activities").add({
    organizationId: orgId,
    leadId: id,
    type,
    title,
    body: body ?? null,
    userId: req.user!.userId,
    createdAt: new Date().toISOString(),
  });
  if (type === "call" || type === "email") {
    await db().collection("leads").doc(id).update({
      lastContactedAt: new Date().toISOString(),
      status: l.status === "new" ? "contacted" : l.status,
    });
  }
  res.status(201).json({
    id: actRef.id,
    leadId: id,
    type,
    title,
    body: body ?? null,
    userId: req.user!.userId,
    userName: null,
    createdAt: new Date().toISOString(),
  });
});

leadsRouter.post("/leads/:id/score", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = req.params.id;
  const snap = await db().collection("leads").doc(id).get();
  if (!snap.exists || snap.data()!.organizationId !== orgId) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }
  const l = { id: snap.id, ...snap.data() };
  const sc = scoreLead({ ...l, budget: l.budget ? Number(l.budget) : null } as never);
  await db().collection("leads").doc(id).update({
    score: sc.score,
    priority: sc.priority,
    nextAction: sc.nextAction,
    updatedAt: new Date().toISOString(),
  });
  const updatedSnap = await db().collection("leads").doc(id).get();
  const updated = { id: updatedSnap.id, ...updatedSnap.data() };
  res.json(formatLead(id, updated));
});

leadsRouter.post("/leads/:id/convert", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = req.params.id;
  const snap = await db().collection("leads").doc(id).get();
  if (!snap.exists || snap.data()!.organizationId !== orgId) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }
  const l = snap.data()!;
  let clientId = l.convertedClientId ?? null;
  if (!clientId) {
    const clientRef = await db().collection("clients").add({
      organizationId: orgId,
      name: l.name,
      email: l.email,
      phone: l.phone,
      company: l.company,
      city: l.city,
      state: l.state,
      notes: l.notes,
      createdById: req.user!.userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    clientId = clientRef.id;
    await db().collection("leads").doc(id).update({
      convertedClientId: clientId,
      status: "won",
      updatedAt: new Date().toISOString(),
    });
  }
  let quotationId: string | null = null;
  if (req.body?.createQuotation) {
    const now = new Date();
    const qn = `QT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${Math.floor(Math.random() * 9000) + 1000}`;
    const qRef = await db().collection("quotations").add({
      organizationId: orgId,
      quotationNumber: qn,
      clientId,
      createdById: req.user!.userId,
      notes: `Converted from lead #${id}`,
      taxPercent: "18",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    quotationId = qRef.id;
  }
  await db().collection("lead_activities").add({
    organizationId: orgId,
    leadId: id,
    type: "conversion",
    title: "Converted to client",
    body: quotationId ? `Quotation #${quotationId} created` : undefined,
    userId: req.user!.userId,
    createdAt: new Date().toISOString(),
  });
  await logAction(req, "CONVERT", "lead", id, `Converted to client ${clientId}`);
  res.json({ clientId, quotationId });
});

leadsRouter.use((err: Error, _req: import("express").Request, res: import("express").Response, _next: import("express").NextFunction) => {
  res.status(500).json({ error: err.message });
});

export default leadsRouter;
