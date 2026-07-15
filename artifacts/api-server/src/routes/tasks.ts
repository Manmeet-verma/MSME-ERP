import { Router } from "express";
import { getDb } from "../lib/firebase";
import { requireAuth } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";

const db = () => getDb();

const tasksRouter = Router();

function fmt(t: Record<string, any>, assignedToName: string | null) {
  return {
    id: t.id,
    title: t.title,
    description: t.description ?? null,
    status: t.status ?? "open",
    priority: t.priority ?? "medium",
    dueAt: t.dueAt ?? null,
    relatedType: t.relatedType ?? "none",
    relatedId: t.relatedId ?? null,
    assignedToId: t.assignedToId ?? null,
    assignedToName,
    completedAt: t.completedAt ?? null,
    createdAt: t.createdAt ?? new Date().toISOString(),
    updatedAt: t.updatedAt ?? new Date().toISOString(),
  };
}

tasksRouter.get("/tasks", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const { status, dueWithinDays } = req.query as Record<string, string | undefined>;
  const snap = await db().collection("tasks").where("organizationId", "==", orgId).get();
  let rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  // Fetch assigned user names
  const assignedIds = [...new Set(rows.map((r) => r.assignedToId).filter(Boolean))];
  const userMap: Record<string, string> = {};
  for (const uid of assignedIds) {
    const userSnap = await db().collection("users").doc(uid).get();
    if (userSnap.exists) {
      userMap[uid] = userSnap.data()!.name;
    }
  }
  // Sort: dueAt ascending (nulls last), then createdAt descending
  rows.sort((a, b) => {
    if (!a.dueAt && !b.dueAt) return (b.createdAt || "").localeCompare(a.createdAt || "");
    if (!a.dueAt) return 1;
    if (!b.dueAt) return -1;
    const da = new Date(a.dueAt).getTime();
    const db2 = new Date(b.dueAt).getTime();
    if (da !== db2) return da - db2;
    return (b.createdAt || "").localeCompare(a.createdAt || "");
  });
  let result = rows.map((r) => fmt(r, r.assignedToId ? userMap[r.assignedToId] ?? null : null));
  if (status) result = result.filter((r) => r.status === status);
  if (dueWithinDays) {
    const days = Number(dueWithinDays);
    const cutoff = Date.now() + days * 86400000;
    result = result.filter((r) => r.dueAt && new Date(r.dueAt).getTime() <= cutoff);
  }
  res.json(result);
});

tasksRouter.post("/tasks", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const b = req.body ?? {};
  if (!b.title) {
    res.status(400).json({ error: "title required" });
    return;
  }
  const now = new Date().toISOString();
  const docRef = await db().collection("tasks").add({
    organizationId: orgId,
    title: b.title,
    description: b.description ?? null,
    status: b.status ?? "open",
    priority: b.priority ?? "medium",
    dueAt: b.dueAt ? new Date(b.dueAt).toISOString() : null,
    relatedType: b.relatedType ?? "none",
    relatedId: b.relatedId ?? null,
    assignedToId: b.assignedToId ?? req.user!.userId,
    createdById: req.user!.userId,
    createdAt: now,
    updatedAt: now,
  });
  await logAction(req, "CREATE", "task", docRef.id);
  res.status(201).json(fmt({ id: docRef.id, createdAt: now, updatedAt: now }, null));
});

tasksRouter.patch("/tasks/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = req.params.id;
  const existingSnap = await db().collection("tasks").doc(id).get();
  if (!existingSnap.exists || existingSnap.data()!.organizationId !== orgId) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  const b = req.body ?? {};
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  for (const f of ["title", "description", "status", "priority", "relatedType", "relatedId", "assignedToId"] as const) {
    if (b[f] !== undefined) updates[f] = b[f];
  }
  if (b.dueAt !== undefined) updates.dueAt = b.dueAt ? new Date(b.dueAt).toISOString() : null;
  if (b.status === "done") updates.completedAt = new Date().toISOString();
  await db().collection("tasks").doc(id).update(updates);
  const updatedSnap = await db().collection("tasks").doc(id).get();
  const t = { id: updatedSnap.id, ...updatedSnap.data() };
  let assignedToName: string | null = null;
  if (t.assignedToId) {
    const userSnap = await db().collection("users").doc(t.assignedToId).get();
    if (userSnap.exists) assignedToName = userSnap.data()!.name;
  }
  res.json(fmt(t, assignedToName));
});

tasksRouter.delete("/tasks/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = req.params.id;
  const snap = await db().collection("tasks").doc(id).get();
  if (!snap.exists || snap.data()!.organizationId !== orgId) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  await db().collection("tasks").doc(id).delete();
  res.json({ message: "Task deleted" });
});

export default tasksRouter;
