import { Router } from "express";
import { getDb } from "../lib/firebase";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";

const db = () => getDb();
const employeesRouter = Router();

function fmt(e: Record<string, unknown>) {
  const leaveBalances = (e.leaveBalances as Record<string, number>) ?? {};
  return {
    id: e.id as string,
    employeeCode: e.employeeCode as string,
    name: e.name as string,
    email: (e.email as string) ?? null,
    phone: (e.phone as string) ?? null,
    role: (e.role as string) ?? null,
    department: (e.department as string) ?? null,
    dateOfJoining: (e.dateOfJoining as string) ?? null,
    status: e.status as string,
    basic: Number(e.basic ?? 0),
    hra: Number(e.hra ?? 0),
    allowances: Number(e.allowances ?? 0),
    otherDeductions: Number(e.otherDeductions ?? 0),
    pfEnabled: e.pfEnabled as boolean,
    esiEnabled: e.esiEnabled as boolean,
    bankName: (e.bankName as string) ?? null,
    bankAccount: (e.bankAccount as string) ?? null,
    ifsc: (e.ifsc as string) ?? null,
    panNumber: (e.panNumber as string) ?? null,
    leaveBalances,
    createdAt: (e.createdAt as string) ?? new Date().toISOString(),
    updatedAt: (e.updatedAt as string) ?? new Date().toISOString(),
  };
}

employeesRouter.get("/employees", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const snap = await db().collection("employees").where("organizationId", "==", orgId).orderBy("createdAt", "desc").get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  res.json(rows.map(fmt));
});

employeesRouter.post("/employees", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user!.organizationId;
  const b = req.body ?? {};
  if (!b.name || !b.employeeCode) {
    res.status(400).json({ error: "name and employeeCode required" });
    return;
  }
  const now = new Date().toISOString();
  const docRef = await db().collection("employees").add({
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
    createdAt: now,
    updatedAt: now,
  });
  const doc = await docRef.get();
  await logAction(req, "CREATE", "employee", docRef.id);
  res.status(201).json(fmt({ id: doc.id, ...doc.data() }));
});

employeesRouter.get("/employees/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = req.params.id;
  const doc = await db().collection("employees").doc(id).get();
  if (!doc.exists || (doc.data()?.organizationId !== orgId)) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  res.json(fmt({ id: doc.id, ...doc.data()! }));
});

employeesRouter.patch("/employees/:id", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = req.params.id;
  const b = req.body ?? {};
  const doc = await db().collection("employees").doc(id).get();
  if (!doc.exists || (doc.data()?.organizationId !== orgId)) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
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
  await db().collection("employees").doc(id).update(updates);
  const updated = await db().collection("employees").doc(id).get();
  await logAction(req, "UPDATE", "employee", id);
  res.json(fmt({ id: updated.id, ...updated.data()! }));
});

employeesRouter.delete("/employees/:id", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = req.params.id;
  const doc = await db().collection("employees").doc(id).get();
  if (!doc.exists || (doc.data()?.organizationId !== orgId)) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  await db().collection("employees").doc(id).delete();
  await logAction(req, "DELETE", "employee", id);
  res.json({ message: "Employee deleted" });
});

export default employeesRouter;
