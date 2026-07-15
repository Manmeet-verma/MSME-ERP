import { Router } from "express";
import { getDb } from "../lib/firebase";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";

const db = () => getDb();

const warehousesRouter = Router();

function fmt(w: any) {
  return {
    id: w.id,
    name: w.name,
    code: w.code ?? null,
    address: w.address ?? null,
    city: w.city ?? null,
    state: w.state ?? null,
    isDefault: w.isDefault,
    isActive: w.isActive,
    createdAt: w.createdAt,
  };
}

warehousesRouter.get("/warehouses", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const snapshot = await db()
    .collection("warehouses")
    .where("organizationId", "==", orgId)
    .get();
  const rows = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  rows.sort((a, b) => (a.name as string).localeCompare(b.name as string));
  res.json(rows.map(fmt));
});

warehousesRouter.post("/warehouses", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const b = req.body ?? {};
  if (!b.name) {
    res.status(400).json({ error: "name required" });
    return;
  }
  if (b.isDefault) {
    const existing = await db()
      .collection("warehouses")
      .where("organizationId", "==", orgId)
      .where("isDefault", "==", true)
      .get();
    const batch = db().batch();
    for (const doc of existing.docs) {
      batch.update(doc.ref, { isDefault: false });
    }
    await batch.commit();
  }
  const now = new Date().toISOString();
  const docRef = await db().collection("warehouses").add({
    organizationId: orgId,
    name: b.name,
    code: b.code ?? null,
    address: b.address ?? null,
    city: b.city ?? null,
    state: b.state ?? null,
    isDefault: b.isDefault ?? false,
    isActive: b.isActive ?? true,
    createdAt: now,
  });
  const snap = await docRef.get();
  const w = { id: docRef.id, ...snap.data()! };
  await logAction(req, "CREATE", "warehouse", w.id, `Created warehouse ${w.name}`);
  res.status(201).json(fmt(w));
});

warehousesRouter.patch("/warehouses/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = req.params.id;
  const b = req.body ?? {};
  const docRef = db().collection("warehouses").doc(id);
  const doc = await docRef.get();
  if (!doc.exists || doc.data()!.organizationId !== orgId) {
    res.status(404).json({ error: "Warehouse not found" });
    return;
  }
  if (b.isDefault) {
    const existing = await db()
      .collection("warehouses")
      .where("organizationId", "==", orgId)
      .where("isDefault", "==", true)
      .get();
    const batch = db().batch();
    for (const d of existing.docs) {
      batch.update(d.ref, { isDefault: false });
    }
    await batch.commit();
  }
  const updates: Record<string, unknown> = {};
  for (const f of ["name", "code", "address", "city", "state", "isDefault", "isActive"] as const) {
    if (b[f] !== undefined) updates[f] = b[f];
  }
  await docRef.update(updates);
  const w = { id: doc.id, ...doc.data()!, ...updates };
  await logAction(req, "UPDATE", "warehouse", id);
  res.json(fmt(w));
});

warehousesRouter.delete("/warehouses/:id", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = req.params.id;
  await db().collection("warehouses").doc(id).delete();
  await logAction(req, "DELETE", "warehouse", id);
  res.json({ message: "Warehouse deleted" });
});

export default warehousesRouter;
