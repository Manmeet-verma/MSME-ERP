import { Router, type Request, type Response } from "express";
import { getDb } from "../lib/firebase";
import { requireAuth, requireRole, type MemberRole } from "../middlewares/auth";

const db = () => getDb();
const leaveRequestsRouter = Router();

function isApprover(role: MemberRole): boolean {
  return role === "owner" || role === "admin";
}

/**
 * Resolve the employee row(s) tied to the requesting user inside this org.
 * Matching is by email (case-insensitive) since employees don't have a hard FK to users.
 */
async function findSelfEmployees(orgId: string, userId: string): Promise<string[]> {
  const userDoc = await db().collection("users").doc(userId).get();
  const userData = userDoc.data();
  if (!userData?.email) return [];
  const empsSnap = await db().collection("employees").where("organizationId", "==", orgId).get();
  const target = userData.email.trim().toLowerCase();
  return empsSnap.docs
    .filter((d) => ((d.data().email as string) ?? "").trim().toLowerCase() === target)
    .map((d) => d.id);
}

leaveRequestsRouter.get("/leave-requests", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const role = req.user!.role;

  if (isApprover(role)) {
    const snap = await db().collection("leave_requests")
      .where("organizationId", "==", orgId)
      .orderBy("createdAt", "desc")
      .get();
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json(rows);
    return;
  }

  const selfIds = await findSelfEmployees(orgId, req.user!.userId);
  if (selfIds.length === 0) {
    res.json([]);
    return;
  }
  const snap = await db().collection("leave_requests")
    .where("organizationId", "==", orgId)
    .where("employeeId", "in", selfIds)
    .orderBy("createdAt", "desc")
    .get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  res.json(rows);
});

leaveRequestsRouter.post("/leave-requests", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const role = req.user!.role;
  const b = req.body ?? {};
  if (!b.fromDate || !b.toDate) {
    res.status(400).json({ error: "fromDate and toDate required" });
    return;
  }

  let targetEmployeeId: string | null = b.employeeId != null ? String(b.employeeId) : null;

  if (!isApprover(role)) {
    const selfIds = await findSelfEmployees(orgId, req.user!.userId);
    if (selfIds.length === 0) {
      res.status(403).json({ error: "No employee profile linked to your account. Ask an admin to add you under Employees." });
      return;
    }
    if (targetEmployeeId != null && !selfIds.includes(targetEmployeeId)) {
      res.status(403).json({ error: "You can only request leave for yourself." });
      return;
    }
    targetEmployeeId = targetEmployeeId ?? selfIds[0];
  } else {
    if (!targetEmployeeId) {
      res.status(400).json({ error: "employeeId required" });
      return;
    }
  }

  const empDoc = await db().collection("employees").doc(targetEmployeeId).get();
  if (!empDoc.exists || empDoc.data()?.organizationId !== orgId) {
    res.status(400).json({ error: "Invalid employee" });
    return;
  }
  const from = new Date(b.fromDate);
  const to = new Date(b.toDate);
  const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000) + 1);
  const now = new Date().toISOString();
  const docRef = await db().collection("leave_requests").add({
    organizationId: orgId,
    employeeId: targetEmployeeId,
    leaveType: String(b.leaveType ?? "casual"),
    fromDate: b.fromDate,
    toDate: b.toDate,
    days: String(b.days ?? days),
    reason: b.reason ?? null,
    status: "pending",
    createdAt: now,
  });
  const doc = await docRef.get();
  res.status(201).json({ id: doc.id, ...doc.data() });
});

async function decideLeave(
  req: Request,
  res: Response,
  decision: "approved" | "rejected",
) {
  const orgId = req.user!.organizationId;
  const id = req.params.id;
  const note = req.body?.note ?? null;

  const lrDoc = await db().collection("leave_requests").doc(id).get();
  if (!lrDoc.exists || lrDoc.data()?.organizationId !== orgId) {
    res.status(404).json({ error: "Leave request not found" });
    return;
  }
  const lr = lrDoc.data()!;
  if (lr.status !== "pending") {
    res.status(409).json({ error: `Already ${lr.status}` });
    return;
  }

  await db().runTransaction(async (tx) => {
    tx.update(db().collection("leave_requests").doc(id), {
      status: decision,
      approverId: req.user!.userId,
      decidedAt: new Date().toISOString(),
      decisionNote: note,
    });

    if (decision === "approved") {
      // Auto-create attendance rows for the range as 'leave'
      const start = new Date(lr.fromDate as string);
      const end = new Date(lr.toDate as string);
      const daysList: string[] = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        daysList.push(d.toISOString().slice(0, 10));
      }
      for (const day of daysList) {
        const existingSnap = await db().collection("attendance")
          .where("employeeId", "==", lr.employeeId)
          .where("date", "==", day)
          .get();
        if (!existingSnap.empty) {
          tx.update(existingSnap.docs[0].ref, { status: "leave", leaveType: lr.leaveType });
        } else {
          const attRef = db().collection("attendance").doc();
          tx.set(attRef, {
            organizationId: orgId,
            employeeId: lr.employeeId,
            date: day,
            status: "leave",
            leaveType: lr.leaveType,
            createdAt: new Date().toISOString(),
          });
        }
      }
      // Decrement leave balance
      const empDoc = await db().collection("employees").doc(lr.employeeId as string).get();
      if (empDoc.exists) {
        const empData = empDoc.data()!;
        const balances = { ...(empData.leaveBalances as Record<string, number> ?? {}) };
        const used = Number(lr.days);
        balances[lr.leaveType as string] = Math.max(0, (balances[lr.leaveType as string] ?? 0) - used);
        tx.update(db().collection("employees").doc(lr.employeeId as string), {
          leaveBalances: balances,
          updatedAt: new Date().toISOString(),
        });
      }
    }
  });

  const updated = await db().collection("leave_requests").doc(id).get();
  res.json({ id: updated.id, ...updated.data() });
}

leaveRequestsRouter.post("/leave-requests/:id/approve", requireAuth, requireRole("owner", "admin"), (req, res) => decideLeave(req, res, "approved"));
leaveRequestsRouter.post("/leave-requests/:id/reject", requireAuth, requireRole("owner", "admin"), (req, res) => decideLeave(req, res, "rejected"));

export default leaveRequestsRouter;
