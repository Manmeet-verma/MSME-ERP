import { Router } from "express";
import { db, tasksTable, usersTable } from "@workspace/db";
import { and, eq, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";

const tasksRouter = Router();

function fmt(t: typeof tasksTable.$inferSelect, assignedToName: string | null) {
  return {
    id: t.id,
    title: t.title,
    description: t.description ?? null,
    status: t.status,
    priority: t.priority,
    dueAt: t.dueAt?.toISOString() ?? null,
    relatedType: t.relatedType,
    relatedId: t.relatedId ?? null,
    assignedToId: t.assignedToId ?? null,
    assignedToName,
    completedAt: t.completedAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

tasksRouter.get("/tasks", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const { status, dueWithinDays } = req.query as Record<string, string | undefined>;
  const rows = await db
    .select({ t: tasksTable, assignedName: usersTable.name })
    .from(tasksTable)
    .leftJoin(usersTable, eq(tasksTable.assignedToId, usersTable.id))
    .where(eq(tasksTable.organizationId, orgId))
    .orderBy(sql`${tasksTable.dueAt} ASC NULLS LAST`, desc(tasksTable.createdAt));
  let result = rows.map((r) => fmt(r.t, r.assignedName ?? null));
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
  const [t] = await db
    .insert(tasksTable)
    .values({
      organizationId: orgId,
      title: b.title,
      description: b.description ?? null,
      status: b.status ?? "open",
      priority: b.priority ?? "medium",
      dueAt: b.dueAt ? new Date(b.dueAt) : null,
      relatedType: b.relatedType ?? "none",
      relatedId: b.relatedId ?? null,
      assignedToId: b.assignedToId ?? req.user!.userId,
      createdById: req.user!.userId,
    })
    .returning();
  await logAction(req, "CREATE", "task", t.id);
  res.status(201).json(fmt(t, null));
});

tasksRouter.patch("/tasks/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  const b = req.body ?? {};
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const f of ["title", "description", "status", "priority", "relatedType", "relatedId", "assignedToId"] as const) {
    if (b[f] !== undefined) updates[f] = b[f];
  }
  if (b.dueAt !== undefined) updates.dueAt = b.dueAt ? new Date(b.dueAt) : null;
  if (b.status === "done") updates.completedAt = new Date();
  const [t] = await db
    .update(tasksTable)
    .set(updates)
    .where(and(eq(tasksTable.id, id), eq(tasksTable.organizationId, orgId)))
    .returning();
  if (!t) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json(fmt(t, null));
});

tasksRouter.delete("/tasks/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  await db
    .delete(tasksTable)
    .where(and(eq(tasksTable.id, id), eq(tasksTable.organizationId, orgId)));
  res.json({ message: "Task deleted" });
});

export default tasksRouter;
