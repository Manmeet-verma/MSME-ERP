import { Router } from "express";
import { db, attendanceTable, employeesTable } from "@workspace/db";
import { and, eq, gte, lte } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const attendanceRouter = Router();

function fmt(a: typeof attendanceTable.$inferSelect) {
  return {
    id: a.id,
    employeeId: a.employeeId,
    date: a.date,
    status: a.status,
    leaveType: a.leaveType ?? null,
    notes: a.notes ?? null,
    createdAt: a.createdAt.toISOString(),
  };
}

attendanceRouter.get("/attendance", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const from = req.query.from ? String(req.query.from) : null;
  const to = req.query.to ? String(req.query.to) : null;
  const employeeId = req.query.employeeId ? Number(req.query.employeeId) : null;
  const conds = [eq(attendanceTable.organizationId, orgId)];
  if (from) conds.push(gte(attendanceTable.date, from));
  if (to) conds.push(lte(attendanceTable.date, to));
  if (employeeId) conds.push(eq(attendanceTable.employeeId, employeeId));
  const rows = await db.select().from(attendanceTable).where(and(...conds));
  res.json(rows.map(fmt));
});

attendanceRouter.post("/attendance", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const b = req.body ?? {};
  if (!b.employeeId || !b.date || !b.status) {
    res.status(400).json({ error: "employeeId, date and status required" });
    return;
  }
  // Validate employee belongs to org
  const [emp] = await db
    .select()
    .from(employeesTable)
    .where(and(eq(employeesTable.id, Number(b.employeeId)), eq(employeesTable.organizationId, orgId)));
  if (!emp) {
    res.status(400).json({ error: "Invalid employee" });
    return;
  }
  // Upsert: delete same employee/date row first
  await db
    .delete(attendanceTable)
    .where(
      and(
        eq(attendanceTable.organizationId, orgId),
        eq(attendanceTable.employeeId, Number(b.employeeId)),
        eq(attendanceTable.date, String(b.date)),
      ),
    );
  const [a] = await db
    .insert(attendanceTable)
    .values({
      organizationId: orgId,
      employeeId: Number(b.employeeId),
      date: String(b.date),
      status: b.status,
      leaveType: b.leaveType ?? null,
      notes: b.notes ?? null,
    })
    .returning();
  res.status(201).json(fmt(a));
});

attendanceRouter.post("/attendance/bulk", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const b = req.body ?? {};
  const date = b.date;
  const entries = Array.isArray(b.entries) ? b.entries : [];
  if (!date || entries.length === 0) {
    res.status(400).json({ error: "date and entries required" });
    return;
  }
  // Wipe the day's attendance for this org, then reinsert
  await db
    .delete(attendanceTable)
    .where(and(eq(attendanceTable.organizationId, orgId), eq(attendanceTable.date, String(date))));
  const rows = await db
    .insert(attendanceTable)
    .values(
      entries.map((e: { employeeId: number; status: string; leaveType?: string; notes?: string }) => ({
        organizationId: orgId,
        employeeId: Number(e.employeeId),
        date: String(date),
        status: e.status as "present" | "absent" | "half" | "leave" | "holiday" | "weekoff",
        leaveType: e.leaveType ?? null,
        notes: e.notes ?? null,
      })),
    )
    .returning();
  res.status(201).json(rows.map(fmt));
});

attendanceRouter.delete("/attendance/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  const result = await db
    .delete(attendanceTable)
    .where(and(eq(attendanceTable.id, id), eq(attendanceTable.organizationId, orgId)))
    .returning();
  if (result.length === 0) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ message: "Deleted" });
});

// Leave: apply / list / approve. A "leave application" is stored as a pending
// attendance row with status "leave". Approve = it stays; reject = delete.
attendanceRouter.get("/leaves", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const rows = await db
    .select()
    .from(attendanceTable)
    .where(and(eq(attendanceTable.organizationId, orgId), eq(attendanceTable.status, "leave")));
  res.json(rows.map(fmt));
});

attendanceRouter.get("/leaves/balances", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const emps = await db.select().from(employeesTable).where(eq(employeesTable.organizationId, orgId));
  const allLeaves = await db
    .select()
    .from(attendanceTable)
    .where(and(eq(attendanceTable.organizationId, orgId), eq(attendanceTable.status, "leave")));
  const used = new Map<number, Record<string, number>>();
  for (const l of allLeaves) {
    const m = used.get(l.employeeId) ?? {};
    const k = l.leaveType ?? "casual";
    m[k] = (m[k] ?? 0) + 1;
    used.set(l.employeeId, m);
  }
  res.json(
    emps.map((e) => ({
      employeeId: e.id,
      employeeName: e.name,
      balances: e.leaveBalances ?? {},
      used: used.get(e.id) ?? {},
    })),
  );
});

export default attendanceRouter;
