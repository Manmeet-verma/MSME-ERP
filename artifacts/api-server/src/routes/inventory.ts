import { Router } from "express";
import {
  db,
  itemsTable,
  warehousesTable,
  stockMovementsTable,
} from "@workspace/db";
import { and, eq, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { recordMovement } from "../lib/stockEngine";

const inventoryRouter = Router();

inventoryRouter.get("/inventory/stock-levels", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const warehouseId = req.query.warehouseId ? Number(req.query.warehouseId) : null;
  const itemId = req.query.itemId ? Number(req.query.itemId) : null;

  const conds = [eq(stockMovementsTable.organizationId, orgId)];
  if (warehouseId) conds.push(eq(stockMovementsTable.warehouseId, warehouseId));
  if (itemId) conds.push(eq(stockMovementsTable.itemId, itemId));

  const rows = await db
    .select({
      itemId: stockMovementsTable.itemId,
      warehouseId: stockMovementsTable.warehouseId,
      qty: sql<string>`coalesce(sum(case when ${stockMovementsTable.direction} = 'in' then ${stockMovementsTable.quantity} else -${stockMovementsTable.quantity} end),0)::text`,
    })
    .from(stockMovementsTable)
    .where(and(...conds))
    .groupBy(stockMovementsTable.itemId, stockMovementsTable.warehouseId);

  const items = await db
    .select()
    .from(itemsTable)
    .where(eq(itemsTable.organizationId, orgId));
  const itemMap = new Map(items.map((i) => [i.id, i]));
  const warehouses = await db
    .select()
    .from(warehousesTable)
    .where(eq(warehousesTable.organizationId, orgId));
  const whMap = new Map(warehouses.map((w) => [w.id, w]));

  res.json(
    rows
      .filter((r) => itemMap.has(r.itemId) && whMap.has(r.warehouseId))
      .map((r) => {
        const it = itemMap.get(r.itemId)!;
        const wh = whMap.get(r.warehouseId)!;
        const q = Number(r.qty);
        return {
          itemId: r.itemId,
          itemSku: it.sku,
          itemName: it.name,
          unit: it.unit,
          warehouseId: r.warehouseId,
          warehouseName: wh.name,
          quantity: q,
          avgCost: Number(it.avgCost),
          value: q * Number(it.avgCost),
        };
      }),
  );
});

inventoryRouter.get("/inventory/movements", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const itemId = req.query.itemId ? Number(req.query.itemId) : null;
  const warehouseId = req.query.warehouseId ? Number(req.query.warehouseId) : null;
  const conds = [eq(stockMovementsTable.organizationId, orgId)];
  if (itemId) conds.push(eq(stockMovementsTable.itemId, itemId));
  if (warehouseId) conds.push(eq(stockMovementsTable.warehouseId, warehouseId));

  const rows = await db
    .select()
    .from(stockMovementsTable)
    .where(and(...conds))
    .orderBy(desc(stockMovementsTable.createdAt))
    .limit(500);

  const items = await db.select().from(itemsTable).where(eq(itemsTable.organizationId, orgId));
  const itemMap = new Map(items.map((i) => [i.id, i]));
  const warehouses = await db.select().from(warehousesTable).where(eq(warehousesTable.organizationId, orgId));
  const whMap = new Map(warehouses.map((w) => [w.id, w]));

  res.json(
    rows.map((m) => {
      const it = itemMap.get(m.itemId);
      const wh = whMap.get(m.warehouseId);
      return {
        id: m.id,
        itemId: m.itemId,
        itemName: it?.name ?? null,
        itemSku: it?.sku ?? null,
        warehouseId: m.warehouseId,
        warehouseName: wh?.name ?? null,
        direction: m.direction,
        quantity: Number(m.quantity),
        unitCost: Number(m.unitCost),
        reason: m.reason,
        referenceType: m.referenceType ?? null,
        referenceId: m.referenceId ?? null,
        notes: m.notes ?? null,
        createdAt: m.createdAt.toISOString(),
      };
    }),
  );
});

inventoryRouter.post("/inventory/movements", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const b = req.body ?? {};
  if (!b.itemId || !b.warehouseId || !b.quantity || !b.direction || !b.reason) {
    res.status(400).json({ error: "itemId, warehouseId, quantity, direction, reason required" });
    return;
  }
  try {
    // Wrap transfer_out + paired transfer_in in a single tx so we never leave
    // a one-sided transfer in the ledger.
    const m = await db.transaction(async (tx) => {
      const out = await recordMovement({
        organizationId: orgId,
        itemId: b.itemId,
        warehouseId: b.warehouseId,
        direction: b.direction,
        quantity: Number(b.quantity),
        unitCost: b.unitCost != null ? Number(b.unitCost) : undefined,
        reason: b.reason,
        referenceType: "manual",
        notes: b.notes ?? null,
        createdById: req.user!.userId,
        executor: tx,
      });
      if (b.reason === "transfer_out" && b.transferToWarehouseId) {
        await recordMovement({
          organizationId: orgId,
          itemId: b.itemId,
          warehouseId: b.transferToWarehouseId,
          direction: "in",
          quantity: Number(b.quantity),
          unitCost: b.unitCost != null ? Number(b.unitCost) : undefined,
          reason: "transfer_in",
          referenceType: "transfer",
          referenceId: out.id,
          createdById: req.user!.userId,
          executor: tx,
        });
      }
      return out;
    });
    res.status(201).json({
      id: m.id,
      itemId: m.itemId,
      warehouseId: m.warehouseId,
      direction: m.direction,
      quantity: Number(m.quantity),
      unitCost: Number(m.unitCost),
      reason: m.reason,
      referenceType: m.referenceType ?? null,
      referenceId: m.referenceId ?? null,
      notes: m.notes ?? null,
      createdAt: m.createdAt.toISOString(),
    });
  } catch (e) {
    req.log.error({ err: e }, "stock movement failed");
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed to record movement" });
  }
});

inventoryRouter.get("/inventory/valuation", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const rows = await db
    .select({
      itemId: stockMovementsTable.itemId,
      warehouseId: stockMovementsTable.warehouseId,
      qty: sql<string>`coalesce(sum(case when ${stockMovementsTable.direction} = 'in' then ${stockMovementsTable.quantity} else -${stockMovementsTable.quantity} end),0)::text`,
    })
    .from(stockMovementsTable)
    .where(eq(stockMovementsTable.organizationId, orgId))
    .groupBy(stockMovementsTable.itemId, stockMovementsTable.warehouseId);

  const items = await db.select().from(itemsTable).where(eq(itemsTable.organizationId, orgId));
  const itemMap = new Map(items.map((i) => [i.id, i]));
  const warehouses = await db.select().from(warehousesTable).where(eq(warehousesTable.organizationId, orgId));
  const whMap = new Map(warehouses.map((w) => [w.id, w]));

  let totalValue = 0;
  let totalItems = 0;
  const byWh = new Map<number, { value: number; items: number; name: string }>();
  const byCat = new Map<string, { value: number; items: number }>();

  for (const r of rows) {
    const it = itemMap.get(r.itemId);
    const wh = whMap.get(r.warehouseId);
    if (!it || !wh) continue;
    const qty = Number(r.qty);
    if (qty <= 0) continue;
    const value = qty * Number(it.avgCost);
    totalValue += value;
    totalItems += 1;
    const w = byWh.get(r.warehouseId) ?? { value: 0, items: 0, name: wh.name };
    w.value += value;
    w.items += 1;
    byWh.set(r.warehouseId, w);
    const cat = it.category ?? "Uncategorized";
    const c = byCat.get(cat) ?? { value: 0, items: 0 };
    c.value += value;
    c.items += 1;
    byCat.set(cat, c);
  }

  res.json({
    totalValue,
    totalItems,
    byWarehouse: Array.from(byWh.entries()).map(([id, v]) => ({
      warehouseId: id,
      warehouseName: v.name,
      value: v.value,
      items: v.items,
    })),
    byCategory: Array.from(byCat.entries()).map(([category, v]) => ({
      category,
      value: v.value,
      items: v.items,
    })),
  });
});

inventoryRouter.get("/inventory/low-stock", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const items = await db
    .select()
    .from(itemsTable)
    .where(and(eq(itemsTable.organizationId, orgId), eq(itemsTable.isActive, true)));
  const stocks = await db
    .select({
      itemId: stockMovementsTable.itemId,
      qty: sql<string>`coalesce(sum(case when ${stockMovementsTable.direction} = 'in' then ${stockMovementsTable.quantity} else -${stockMovementsTable.quantity} end),0)::text`,
    })
    .from(stockMovementsTable)
    .where(eq(stockMovementsTable.organizationId, orgId))
    .groupBy(stockMovementsTable.itemId);
  const stockMap = new Map(stocks.map((s) => [s.itemId, Number(s.qty)]));

  const low = items
    .filter((i) => Number(i.lowStockThreshold) > 0)
    .map((i) => ({
      itemId: i.id,
      itemSku: i.sku,
      itemName: i.name,
      unit: i.unit,
      currentStock: stockMap.get(i.id) ?? 0,
      lowStockThreshold: Number(i.lowStockThreshold),
    }))
    .filter((r) => r.currentStock <= r.lowStockThreshold);
  res.json(low);
});

export default inventoryRouter;
