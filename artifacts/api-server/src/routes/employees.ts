import { Router } from "express";
import { db, employeesTable } from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";

const employeesRouter = Router();

function fmt(e: typeof employeesTable.$inferSelect) {
  return {
    id: e.id,
    employeeCode: e.employeeCode,
    name: e.name,
    email: e.email ?? null,
    phone: e.phone ?? null,
    role: e.role ?? null,
    department: e.department ?? null,
    dateOfJoining: e.dateOfJoining ?? null,
    status: e.status,
    basic: Number(e.basic),
    hra: Number(e.hra),
    allowances: Number(e.allowances),
    otherDeductions: Number(e.otherDeductions),
    pfEnabled: e.pfEnabled,
    esiEnabled: e.esiEnabled,
    bankName: e.bankName ?? null,
    bankAccount: e.bankAccount ?? null,
    ifsc: e.ifsc ?? null,
    panNumber: e.panNumber ?? null,
    leaveBalances: e.leaveBalances ?? {},
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

employeesRouter.get("/employees", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const rows = await db
    .select()
    .from(employeesTable)
    .where(eq(employeesTable.organizationId, orgId))
    .orderBy(desc(employeesTable.createdAt));
  res.json(rows.map(fmt));
});

employeesRouter.post("/employees", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user!.organizationId;
  const b = req.body ?? {};
  if (!b.name || !b.employeeCode) {
    res.status(400).json({ error: "name and employeeCode required" });
    return;
  }
  const [e] = await db
    .insert(employeesTable)
    .values({
      organizationId: orgId,
      employeeCode: String(b.employeeCode),
      name: String(b.name),
      email: b.email ?? null,
      phone: b.phone ?? null,
      role: b.role ?? null,
      department: b.department ?? null,
      dateOfJoining: b.dateOfJoining ?? null,
      status: b.status ?? "active",
      basic: String(b.basic ?? 0),
      hra: String(b.hra ?? 0),
      allowances: String(b.allowances ?? 0),
      otherDeductions: String(b.otherDeductions ?? 0),
      pfEnabled: Boolean(b.pfEnabled),
      esiEnabled: Boolean(b.esiEnabled),
      bankName: b.bankName ?? null,
      bankAccount: b.bankAccount ?? null,
      ifsc: b.ifsc ?? null,
      panNumber: b.panNumber ?? null,
      leaveBalances: b.leaveBalances ?? { casual: 12, sick: 7, earned: 15 },
    })
    .returning();
  await logAction(req, "CREATE", "employee", e.id);
  res.status(201).json(fmt(e));
});

employeesRouter.get("/employees/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  const [e] = await db
    .select()
    .from(employeesTable)
    .where(and(eq(employeesTable.id, id), eq(employeesTable.organizationId, orgId)));
  if (!e) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  res.json(fmt(e));
});

employeesRouter.patch("/employees/:id", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  const b = req.body ?? {};
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const f of ["employeeCode", "name", "email", "phone", "role", "department", "dateOfJoining", "status",
    "bankName", "bankAccount", "ifsc", "panNumber", "leaveBalances"] as const) {
    if (b[f] !== undefined) updates[f] = b[f];
  }
  for (const f of ["basic", "hra", "allowances", "otherDeductions"] as const) {
    if (b[f] !== undefined) updates[f] = String(b[f]);
  }
  for (const f of ["pfEnabled", "esiEnabled"] as const) {
    if (b[f] !== undefined) updates[f] = Boolean(b[f]);
  }
  const [e] = await db
    .update(employeesTable)
    .set(updates)
    .where(and(eq(employeesTable.id, id), eq(employeesTable.organizationId, orgId)))
    .returning();
  if (!e) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  await logAction(req, "UPDATE", "employee", id);
  res.json(fmt(e));
});

employeesRouter.delete("/employees/:id", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  const result = await db
    .delete(employeesTable)
    .where(and(eq(employeesTable.id, id), eq(employeesTable.organizationId, orgId)))
    .returning();
  if (result.length === 0) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  await logAction(req, "DELETE", "employee", id);
  res.json({ message: "Employee deleted" });
});

export default employeesRouter;
