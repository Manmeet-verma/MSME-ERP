import { Router } from "express";
import { getDb } from "../lib/firebase";
import { requireAuth } from "../middlewares/auth";
import { recordMovement } from "../lib/stockEngine";

const db = () => getDb();

const inventoryRouter = Router();

inventoryRouter.get("/inventory/stock-levels", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const warehouseId = req.query.warehouseId as string | undefined;
  const itemId = req.query.itemId as string | undefined;

  let movementsSnap;
  if (warehouseId && itemId) {
    movementsSnap = await db()
      .collection("stock_movements")
      .where("organizationId", "==", orgId)
      .where("warehouseId", "==", warehouseId)
      .where("itemId", "==", itemId)
      .get();
  } else if (warehouseId) {
    movementsSnap = await db()
      .collection("stock_movements")
      .where("organizationId", "==", orgId)
      .where("warehouseId", "==", warehouseId)
      .get();
  } else if (itemId) {
    movementsSnap = await db()
      .collection("stock_movements")
      .where("organizationId", "==", orgId)
      .where("itemId", "==", itemId)
      .get();
  } else {
    movementsSnap = await db()
      .collection("stock_movements")
      .where("organizationId", "==", orgId)
      .get();
  }

  const stockMap = new Map<string, Map<string, number>>();
  for (const doc of movementsSnap.docs) {
    const data = doc.data();
    const iId = data.itemId as string;
    const wId = data.warehouseId as string;
    const quantity = Number(data.quantity);
    if (!stockMap.has(iId)) stockMap.set(iId, new Map());
    const whMap = stockMap.get(iId)!;
    const current = whMap.get(wId) || 0;
    whMap.set(wId, current + (data.direction === "in" ? quantity : -quantity));
  }

  const itemsSnap = await db()
    .collection("items")
    .where("organizationId", "==", orgId)
    .get();
  const itemMap = new Map<string, any>();
  for (const doc of itemsSnap.docs) {
    itemMap.set(doc.id, { id: doc.id, ...doc.data() });
  }

  const warehousesSnap = await db()
    .collection("warehouses")
    .where("organizationId", "==", orgId)
    .get();
  const whMap = new Map<string, any>();
  for (const doc of warehousesSnap.docs) {
    whMap.set(doc.id, { id: doc.id, ...doc.data() });
  }

  const result: any[] = [];
  for (const [iId, whQtyMap] of stockMap) {
    const it = itemMap.get(iId);
    if (!it) continue;
    for (const [wId, q] of whQtyMap) {
      const wh = whMap.get(wId);
      if (!wh) continue;
      result.push({
        itemId: iId,
        itemSku: it.sku,
        itemName: it.name,
        unit: it.unit,
        warehouseId: wId,
        warehouseName: wh.name,
        quantity: q,
        avgCost: Number(it.avgCost),
        value: q * Number(it.avgCost),
      });
    }
  }

  res.json(result);
});

inventoryRouter.get("/inventory/movements", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const itemId = req.query.itemId as string | undefined;
  const warehouseId = req.query.warehouseId as string | undefined;

  let movementsSnap;
  if (itemId && warehouseId) {
    movementsSnap = await db()
      .collection("stock_movements")
      .where("organizationId", "==", orgId)
      .where("itemId", "==", itemId)
      .where("warehouseId", "==", warehouseId)
      .get();
  } else if (itemId) {
    movementsSnap = await db()
      .collection("stock_movements")
      .where("organizationId", "==", orgId)
      .where("itemId", "==", itemId)
      .get();
  } else if (warehouseId) {
    movementsSnap = await db()
      .collection("stock_movements")
      .where("organizationId", "==", orgId)
      .where("warehouseId", "==", warehouseId)
      .get();
  } else {
    movementsSnap = await db()
      .collection("stock_movements")
      .where("organizationId", "==", orgId)
      .get();
  }

  const rows = movementsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  rows.sort((a, b) => ((b.createdAt as string) ?? "").localeCompare((a.createdAt as string) ?? ""));
  const limited = rows.slice(0, 500);

  const itemsSnap = await db()
    .collection("items")
    .where("organizationId", "==", orgId)
    .get();
  const itemMap = new Map<string, any>();
  for (const doc of itemsSnap.docs) {
    itemMap.set(doc.id, { id: doc.id, ...doc.data() });
  }

  const warehousesSnap = await db()
    .collection("warehouses")
    .where("organizationId", "==", orgId)
    .get();
  const whMap = new Map<string, any>();
  for (const doc of warehousesSnap.docs) {
    whMap.set(doc.id, { id: doc.id, ...doc.data() });
  }

  res.json(
    limited.map((m) => {
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
        createdAt: m.createdAt,
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
    const m = await db().runTransaction(async (tx) => {
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
      createdAt: m.createdAt,
    });
  } catch (e) {
    req.log.error({ err: e }, "stock movement failed");
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed to record movement" });
  }
});

inventoryRouter.get("/inventory/valuation", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;

  const movementsSnap = await db()
    .collection("stock_movements")
    .where("organizationId", "==", orgId)
    .get();

  const stockMap = new Map<string, Map<string, number>>();
  for (const doc of movementsSnap.docs) {
    const data = doc.data();
    const iId = data.itemId as string;
    const wId = data.warehouseId as string;
    const quantity = Number(data.quantity);
    if (!stockMap.has(iId)) stockMap.set(iId, new Map());
    const whMap = stockMap.get(iId)!;
    const current = whMap.get(wId) || 0;
    whMap.set(wId, current + (data.direction === "in" ? quantity : -quantity));
  }

  const itemsSnap = await db()
    .collection("items")
    .where("organizationId", "==", orgId)
    .get();
  const itemMap = new Map<string, any>();
  for (const doc of itemsSnap.docs) {
    itemMap.set(doc.id, { id: doc.id, ...doc.data() });
  }

  const warehousesSnap = await db()
    .collection("warehouses")
    .where("organizationId", "==", orgId)
    .get();
  const whMap = new Map<string, any>();
  for (const doc of warehousesSnap.docs) {
    whMap.set(doc.id, { id: doc.id, ...doc.data() });
  }

  let totalValue = 0;
  let totalItems = 0;
  const byWh = new Map<string, { value: number; items: number; name: string }>();
  const byCat = new Map<string, { value: number; items: number }>();

  for (const [iId, whQtyMap] of stockMap) {
    const it = itemMap.get(iId);
    if (!it) continue;
    for (const [wId, qty] of whQtyMap) {
      const wh = whMap.get(wId);
      if (!wh) continue;
      if (qty <= 0) continue;
      const value = qty * Number(it.avgCost);
      totalValue += value;
      totalItems += 1;
      const w = byWh.get(wId) ?? { value: 0, items: 0, name: wh.name };
      w.value += value;
      w.items += 1;
      byWh.set(wId, w);
      const cat = it.category ?? "Uncategorized";
      const c = byCat.get(cat) ?? { value: 0, items: 0 };
      c.value += value;
      c.items += 1;
      byCat.set(cat, c);
    }
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

  const itemsSnap = await db()
    .collection("items")
    .where("organizationId", "==", orgId)
    .where("isActive", "==", true)
    .get();
  const items = itemsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  const stocksSnap = await db()
    .collection("stock_movements")
    .where("organizationId", "==", orgId)
    .get();
  const stockMap = new Map<string, number>();
  for (const doc of stocksSnap.docs) {
    const data = doc.data();
    const iId = data.itemId as string;
    const quantity = Number(data.quantity);
    const current = stockMap.get(iId) || 0;
    stockMap.set(iId, current + (data.direction === "in" ? quantity : -quantity));
  }

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
