import { Router } from "express";
import { getDb } from "../lib/firebase";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";
import { ensureDefaultWarehouse, recordMovement } from "../lib/stockEngine";

const db = () => getDb();

const itemsRouter = Router();

async function stockMap(orgId: string, itemIds: string[]): Promise<Map<string, number>> {
  if (itemIds.length === 0) return new Map();
  const snapshot = await db()
    .collection("stock_movements")
    .where("organizationId", "==", orgId)
    .where("itemId", "in", itemIds)
    .get();
  const map = new Map<string, number>();
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const itemId = data.itemId as string;
    const quantity = Number(data.quantity);
    const current = map.get(itemId) || 0;
    map.set(itemId, current + (data.direction === "in" ? quantity : -quantity));
  }
  return map;
}

function fmt(i: any, currentStock = 0) {
  return {
    id: i.id,
    sku: i.sku,
    name: i.name,
    category: i.category ?? null,
    description: i.description ?? null,
    unit: i.unit,
    hsnCode: i.hsnCode ?? null,
    gstRate: Number(i.gstRate),
    salePrice: Number(i.salePrice),
    purchasePrice: Number(i.purchasePrice),
    avgCost: Number(i.avgCost),
    openingStock: Number(i.openingStock),
    lowStockThreshold: Number(i.lowStockThreshold),
    currentStock,
    isActive: i.isActive,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
  };
}

itemsRouter.get("/items", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const snapshot = await db()
    .collection("items")
    .where("organizationId", "==", orgId)
    .get();
  const rows = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  rows.sort((a, b) => (a.name as string).localeCompare(b.name as string));
  const stocks = await stockMap(orgId, rows.map((r) => r.id));
  res.json(rows.map((r) => fmt(r, stocks.get(r.id) ?? 0)));
});

itemsRouter.get("/items/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = req.params.id;
  const doc = await db().collection("items").doc(id).get();
  if (!doc.exists || doc.data()!.organizationId !== orgId) {
    res.status(404).json({ error: "Item not found" });
    return;
  }
  const i = { id: doc.id, ...doc.data()! };
  const s = await stockMap(orgId, [id]);
  res.json(fmt(i, s.get(id) ?? 0));
});

itemsRouter.post("/items", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const b = req.body ?? {};
  if (!b.sku || !b.name) {
    res.status(400).json({ error: "sku and name required" });
    return;
  }
  const now = new Date().toISOString();
  const docRef = await db().collection("items").add({
    organizationId: orgId,
    sku: b.sku,
    name: b.name,
    category: b.category ?? null,
    description: b.description ?? null,
    unit: b.unit ?? "pcs",
    hsnCode: b.hsnCode ?? null,
    gstRate: b.gstRate != null ? String(b.gstRate) : "18",
    salePrice: b.salePrice != null ? String(b.salePrice) : "0",
    purchasePrice: b.purchasePrice != null ? String(b.purchasePrice) : "0",
    avgCost: b.purchasePrice != null ? String(b.purchasePrice) : "0",
    openingStock: b.openingStock != null ? String(b.openingStock) : "0",
    lowStockThreshold: b.lowStockThreshold != null ? String(b.lowStockThreshold) : "0",
    isActive: b.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  });
  const snap = await docRef.get();
  const i = { id: docRef.id, ...snap.data()! };

  const opening = Number(b.openingStock ?? 0);
  if (opening > 0) {
    const warehouseId = await ensureDefaultWarehouse(orgId);
    await recordMovement({
      organizationId: orgId,
      itemId: i.id,
      warehouseId,
      direction: "in",
      quantity: opening,
      unitCost: Number(i.purchasePrice),
      reason: "opening",
      referenceType: "item",
      referenceId: i.id,
      createdById: req.user!.userId,
    });
  }
  await logAction(req, "CREATE", "item", i.id, `Created item ${i.sku}`);
  const s = await stockMap(orgId, [i.id]);
  res.status(201).json(fmt(i, s.get(i.id) ?? 0));
});

itemsRouter.patch("/items/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = req.params.id;
  const b = req.body ?? {};
  const docRef = db().collection("items").doc(id);
  const doc = await docRef.get();
  if (!doc.exists || doc.data()!.organizationId !== orgId) {
    res.status(404).json({ error: "Item not found" });
    return;
  }
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  for (const f of ["sku", "name", "category", "description", "unit", "hsnCode", "isActive"] as const) {
    if (b[f] !== undefined) updates[f] = b[f];
  }
  for (const f of ["gstRate", "salePrice", "purchasePrice", "lowStockThreshold"] as const) {
    if (b[f] !== undefined && b[f] !== null) updates[f] = String(b[f]);
  }
  await docRef.update(updates);
  const i = { id: doc.id, ...doc.data()!, ...updates };
  await logAction(req, "UPDATE", "item", id);
  const s = await stockMap(orgId, [id]);
  res.json(fmt(i, s.get(id) ?? 0));
});

itemsRouter.delete("/items/:id", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = req.params.id;
  await db().collection("items").doc(id).delete();
  await logAction(req, "DELETE", "item", id);
  res.json({ message: "Item deleted" });
});

export default itemsRouter;
