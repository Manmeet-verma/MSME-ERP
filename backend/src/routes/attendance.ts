import { Router } from "express";
import { getDb } from "../lib/firebase";
import { requireAuth } from "../middlewares/auth";

const db = () => getDb();
const attendanceRouter = Router();

function fmt(a: Record<string, unknown>) {
  return {
    id: a.id as string,
    employeeId: a.employeeId as string,
    date: a.date as string,
    status: a.status as string,
    leaveType: (a.leaveType as string) ?? null,
    notes: (a.notes as string) ?? null,
    createdAt: (a.createdAt as string) ?? new Date().toISOString(),
  };
}

attendanceRouter.get("/attendance", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const from = req.query.from ? String(req.query.from) : null;
  const to = req.query.to ? String(req.query.to) : null;
  const employeeId = req.query.employeeId ? String(req.query.employeeId) : null;

  let query: FirebaseFirestore.Query = db().collection("attendance").where("organizationId", "==", orgId);
  if (employeeId) query = query.where("employeeId", "==", employeeId);
  if (from) query = query.where("date", ">=", from);
  if (to) query = query.where("date", "<=", to);

  const snap = await query.get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  res.json(rows.map(fmt));
});

attendanceRouter.post("/attendance", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const b = req.body ?? {};
  if (!b.employeeId || !b.date || !b.status) {
    res.status(400).json({ error: "employeeId, date and status required" });
    return;
  }
  const empSnap = await db().collection("employees").doc(String(b.employeeId)).get();
  if (!empSnap.exists || empSnap.data()?.organizationId !== orgId) {
    res.status(400).json({ error: "Invalid employee" });
    return;
  }
  // Upsert: delete same employee/date row first
  const existing = await db().collection("attendance")
    .where("organizationId", "==", orgId)
    .where("employeeId", "==", String(b.employeeId))
    .where("date", "==", String(b.date))
    .get();
  for (const doc of existing.docs) {
    await doc.ref.delete();
  }
  const now = new Date().toISOString();
  const docRef = await db().collection("attendance").add({
    organizationId: orgId,
    employeeId: String(b.employeeId),
    date: String(b.date),
    status: b.status,
    leaveType: b.leaveType ?? null,
    notes: b.notes ?? null,
    createdAt: now,
  });
  const doc = await docRef.get();
  res.status(201).json(fmt({ id: doc.id, ...doc.data() }));
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
  const existing = await db().collection("attendance")
    .where("organizationId", "==", orgId)
    .where("date", "==", String(date))
    .get();
  for (const doc of existing.docs) {
    await doc.ref.delete();
  }
  const now = new Date().toISOString();
  const results: Record<string, unknown>[] = [];
  for (const e of entries as Array<{ employeeId: string; status: string; leaveType?: string; notes?: string }>) {
    const docRef = await db().collection("attendance").add({
      organizationId: orgId,
      employeeId: String(e.employeeId),
      date: String(date),
      status: e.status,
      leaveType: e.leaveType ?? null,
      notes: e.notes ?? null,
      createdAt: now,
    });
    const doc = await docRef.get();
    results.push({ id: doc.id, ...doc.data() });
  }
  res.status(201).json(results.map(fmt));
});

attendanceRouter.delete("/attendance/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = req.params.id;
  const doc = await db().collection("attendance").doc(id).get();
  if (!doc.exists || doc.data()?.organizationId !== orgId) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await db().collection("attendance").doc(id).delete();
  res.json({ message: "Deleted" });
});

attendanceRouter.get("/leaves", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const snap = await db().collection("attendance")
    .where("organizationId", "==", orgId)
    .where("status", "==", "leave")
    .get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  res.json(rows.map(fmt));
});

attendanceRouter.get("/leaves/balances", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const empsSnap = await db().collection("employees").where("organizationId", "==", orgId).get();
  const allLeavesSnap = await db().collection("attendance")
    .where("organizationId", "==", orgId)
    .where("status", "==", "leave")
    .get();
  const used = new Map<string, Record<string, number>>();
  for (const lDoc of allLeavesSnap.docs) {
    const l = lDoc.data();
    const empId = l.employeeId as string;
    const m = used.get(empId) ?? {};
    const k = (l.leaveType as string) ?? "casual";
    m[k] = (m[k] ?? 0) + 1;
    used.set(empId, m);
  }
  res.json(
    empsSnap.docs.map((d) => {
      const e = d.data();
      return {
        employeeId: d.id,
        employeeName: e.name,
        balances: (e.leaveBalances as Record<string, number>) ?? {},
        used: used.get(d.id) ?? {},
      };
    }),
  );
});

export default attendanceRouter;
