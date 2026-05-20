import { Router } from "express";
import { db, itemsTable, stockMovementsTable } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";
import { ensureDefaultWarehouse, recordMovement } from "../lib/stockEngine";

const itemsRouter = Router();

async function stockMap(orgId: number, itemIds: number[]): Promise<Map<number, number>> {
  if (itemIds.length === 0) return new Map();
  const rows = await db
    .select({
      itemId: stockMovementsTable.itemId,
      qty: sql<string>`coalesce(sum(case when ${stockMovementsTable.direction} = 'in' then ${stockMovementsTable.quantity} else -${stockMovementsTable.quantity} end),0)::text`,
    })
    .from(stockMovementsTable)
    .where(
      and(
        eq(stockMovementsTable.organizationId, orgId),
        sql`${stockMovementsTable.itemId} = ANY(${itemIds})`,
      ),
    )
    .groupBy(stockMovementsTable.itemId);
  return new Map(rows.map((r) => [r.itemId, Number(r.qty)]));
}

function fmt(i: typeof itemsTable.$inferSelect, currentStock = 0) {
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
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
  };
}

itemsRouter.get("/items", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const rows = await db
    .select()
    .from(itemsTable)
    .where(eq(itemsTable.organizationId, orgId))
    .orderBy(itemsTable.name);
  const stocks = await stockMap(orgId, rows.map((r) => r.id));
  res.json(rows.map((r) => fmt(r, stocks.get(r.id) ?? 0)));
});

itemsRouter.get("/items/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  const [i] = await db
    .select()
    .from(itemsTable)
    .where(and(eq(itemsTable.id, id), eq(itemsTable.organizationId, orgId)));
  if (!i) {
    res.status(404).json({ error: "Item not found" });
    return;
  }
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
  const [i] = await db
    .insert(itemsTable)
    .values({
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
    })
    .returning();

  // Record opening stock movement if provided
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
  const id = Number(req.params.id);
  const b = req.body ?? {};
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const f of ["sku", "name", "category", "description", "unit", "hsnCode", "isActive"] as const) {
    if (b[f] !== undefined) updates[f] = b[f];
  }
  for (const f of ["gstRate", "salePrice", "purchasePrice", "lowStockThreshold"] as const) {
    if (b[f] !== undefined && b[f] !== null) updates[f] = String(b[f]);
  }
  const [i] = await db
    .update(itemsTable)
    .set(updates)
    .where(and(eq(itemsTable.id, id), eq(itemsTable.organizationId, orgId)))
    .returning();
  if (!i) {
    res.status(404).json({ error: "Item not found" });
    return;
  }
  await logAction(req, "UPDATE", "item", id);
  const s = await stockMap(orgId, [id]);
  res.json(fmt(i, s.get(id) ?? 0));
});

itemsRouter.delete("/items/:id", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  await db
    .delete(itemsTable)
    .where(and(eq(itemsTable.id, id), eq(itemsTable.organizationId, orgId)));
  await logAction(req, "DELETE", "item", id);
  res.json({ message: "Item deleted" });
});

export default itemsRouter;
