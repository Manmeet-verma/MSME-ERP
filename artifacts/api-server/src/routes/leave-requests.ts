import { Router, type Request, type Response } from "express";
import { and, eq, desc } from "drizzle-orm";
import { db, leaveRequestsTable, employeesTable, attendanceTable } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";

const leaveRequestsRouter = Router();

leaveRequestsRouter.get("/leave-requests", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const rows = await db
    .select()
    .from(leaveRequestsTable)
    .where(eq(leaveRequestsTable.organizationId, orgId))
    .orderBy(desc(leaveRequestsTable.createdAt));
  res.json(rows);
});

leaveRequestsRouter.post("/leave-requests", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const b = req.body ?? {};
  if (!b.employeeId || !b.fromDate || !b.toDate) {
    res.status(400).json({ error: "employeeId, fromDate, toDate required" });
    return;
  }
  const [emp] = await db
    .select()
    .from(employeesTable)
    .where(and(eq(employeesTable.id, Number(b.employeeId)), eq(employeesTable.organizationId, orgId)));
  if (!emp) { res.status(400).json({ error: "Invalid employee" }); return; }
  const from = new Date(b.fromDate);
  const to = new Date(b.toDate);
  const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000) + 1);
  const [row] = await db
    .insert(leaveRequestsTable)
    .values({
      organizationId: orgId,
      employeeId: Number(b.employeeId),
      leaveType: String(b.leaveType ?? "casual"),
      fromDate: b.fromDate,
      toDate: b.toDate,
      days: String(b.days ?? days),
      reason: b.reason ?? null,
      status: "pending",
    })
    .returning();
  res.status(201).json(row);
});

async function decideLeave(
  req: Request,
  res: Response,
  decision: "approved" | "rejected",
) {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  const note = req.body?.note ?? null;
  const [lr] = await db
    .select()
    .from(leaveRequestsTable)
    .where(and(eq(leaveRequestsTable.id, id), eq(leaveRequestsTable.organizationId, orgId)));
  if (!lr) { res.status(404).json({ error: "Leave request not found" }); return; }
  if (lr.status !== "pending") { res.status(409).json({ error: `Already ${lr.status}` }); return; }
  await db.transaction(async (tx) => {
    await tx
      .update(leaveRequestsTable)
      .set({ status: decision, approverId: req.user!.userId, decidedAt: new Date(), decisionNote: note })
      .where(eq(leaveRequestsTable.id, id));
    if (decision === "approved") {
      // Auto-create attendance rows for the range as 'leave'
      const start = new Date(lr.fromDate);
      const end = new Date(lr.toDate);
      const days: string[] = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        days.push(d.toISOString().slice(0, 10));
      }
      for (const day of days) {
        const [existing] = await tx
          .select()
          .from(attendanceTable)
          .where(and(
            eq(attendanceTable.employeeId, lr.employeeId),
            eq(attendanceTable.date, day),
          ));
        if (existing) {
          await tx
            .update(attendanceTable)
            .set({ status: "leave", leaveType: lr.leaveType })
            .where(eq(attendanceTable.id, existing.id));
        } else {
          await tx.insert(attendanceTable).values({
            organizationId: orgId,
            employeeId: lr.employeeId,
            date: day,
            status: "leave",
            leaveType: lr.leaveType,
          });
        }
      }
      // Decrement leave balance
      const [emp] = await tx.select().from(employeesTable).where(eq(employeesTable.id, lr.employeeId));
      if (emp) {
        const balances = { ...(emp.leaveBalances ?? {}) };
        const used = Number(lr.days);
        balances[lr.leaveType] = Math.max(0, (balances[lr.leaveType] ?? 0) - used);
        await tx
          .update(employeesTable)
          .set({ leaveBalances: balances, updatedAt: new Date() })
          .where(eq(employeesTable.id, lr.employeeId));
      }
    }
  });
  const [updated] = await db.select().from(leaveRequestsTable).where(eq(leaveRequestsTable.id, id));
  res.json(updated);
}

leaveRequestsRouter.post("/leave-requests/:id/approve", requireAuth, requireRole("owner", "admin"), (req, res) => decideLeave(req, res, "approved"));
leaveRequestsRouter.post("/leave-requests/:id/reject", requireAuth, requireRole("owner", "admin"), (req, res) => decideLeave(req, res, "rejected"));

export default leaveRequestsRouter;
