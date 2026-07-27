import { Router } from "express";
import { getDb } from "../lib/firebase";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";

const db = () => getDb();

const vendorsRouter = Router();

function fmt(v: any) {
  return {
    id: v.id,
    name: v.name,
    contactName: v.contactName ?? null,
    email: v.email ?? null,
    phone: v.phone ?? null,
    address: v.address ?? null,
    city: v.city ?? null,
    state: v.state ?? null,
    gstNumber: v.gstNumber ?? null,
    paymentTermsDays: v.paymentTermsDays,
    notes: v.notes ?? null,
    createdAt: v.createdAt,
  };
}

vendorsRouter.get("/vendors", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const snapshot = await db()
    .collection("vendors")
    .where("organizationId", "==", orgId)
    .get();
  const rows = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  rows.sort((a, b) => (a.name as string).localeCompare(b.name as string));
  res.json(rows.map(fmt));
});

vendorsRouter.get("/vendors/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = req.params.id;
  const doc = await db().collection("vendors").doc(id).get();
  if (!doc.exists || doc.data()!.organizationId !== orgId) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }
  res.json(fmt({ id: doc.id, ...doc.data()! }));
});

vendorsRouter.post("/vendors", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const b = req.body ?? {};
  if (!b.name) {
    res.status(400).json({ error: "name required" });
    return;
  }
  const now = new Date().toISOString();
  const docRef = await db().collection("vendors").add({
    organizationId: orgId,
    name: b.name,
    contactName: b.contactName ?? null,
    email: b.email ?? null,
    phone: b.phone ?? null,
    address: b.address ?? null,
    city: b.city ?? null,
    state: b.state ?? null,
    gstNumber: b.gstNumber ?? null,
    paymentTermsDays: b.paymentTermsDays ?? 30,
    notes: b.notes ?? null,
    createdAt: now,
  });
  const snap = await docRef.get();
  const v = { id: docRef.id, ...snap.data()! };
  await logAction(req, "CREATE", "vendor", v.id, `Created vendor ${v.name}`);
  res.status(201).json(fmt(v));
});

vendorsRouter.patch("/vendors/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = req.params.id;
  const b = req.body ?? {};
  const docRef = db().collection("vendors").doc(id);
  const doc = await docRef.get();
  if (!doc.exists || doc.data()!.organizationId !== orgId) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }
  const updates: Record<string, unknown> = {};
  for (const f of ["name", "contactName", "email", "phone", "address", "city", "state", "gstNumber", "paymentTermsDays", "notes"] as const) {
    if (b[f] !== undefined) updates[f] = b[f];
  }
  await docRef.update(updates);
  const v = { id: doc.id, ...doc.data()!, ...updates };
  await logAction(req, "UPDATE", "vendor", id);
  res.json(fmt(v));
});

vendorsRouter.delete("/vendors/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = req.params.id;
  await db().collection("vendors").doc(id).delete();
  await logAction(req, "DELETE", "vendor", id);
  res.json({ message: "Vendor deleted" });
});

export default vendorsRouter;
