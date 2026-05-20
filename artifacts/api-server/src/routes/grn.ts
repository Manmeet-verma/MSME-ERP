import { Router } from "express";
import {
  db,
  grnTable,
  grnItemsTable,
  purchaseOrdersTable,
  purchaseOrderItemsTable,
  itemsTable,
  warehousesTable,
} from "@workspace/db";
import { and, eq, desc, inArray, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";
import { recordMovement } from "../lib/stockEngine";

const grnRouter = Router();

function genNumber() {
  const d = new Date();
  return `GRN-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}-${Math.floor(Math.random() * 9000) + 1000}`;
}

async function fmt(g: typeof grnTable.$inferSelect) {
  const items = await db.select().from(grnItemsTable).where(eq(grnItemsTable.grnId, g.id));
  const itemIds = items.map((i) => i.itemId);
  const itemsMap = itemIds.length
    ? new Map(
        (await db.select().from(itemsTable).where(inArray(itemsTable.id, itemIds))).map((it) => [
          it.id,
          it,
        ]),
      )
    : new Map();
  const wh = g.warehouseId
    ? (await db.select().from(warehousesTable).where(eq(warehousesTable.id, g.warehouseId)))[0]
    : null;
  const po = g.purchaseOrderId
    ? (await db.select().from(purchaseOrdersTable).where(eq(purchaseOrdersTable.id, g.purchaseOrderId)))[0]
    : null;
  return {
    id: g.id,
    grnNumber: g.grnNumber,
    purchaseOrderId: g.purchaseOrderId ?? null,
    poNumber: po?.poNumber ?? null,
    warehouseId: g.warehouseId,
    warehouseName: wh?.name ?? null,
    receivedAt: g.receivedAt.toISOString(),
    notes: g.notes ?? null,
    items: items.map((i) => {
      const it = itemsMap.get(i.itemId);
      return {
        id: i.id,
        poItemId: i.poItemId ?? null,
        itemId: i.itemId,
        itemName: it?.name ?? null,
        itemSku: it?.sku ?? null,
        quantity: Number(i.quantity),
        unitCost: Number(i.unitCost),
      };
    }),
    createdAt: g.createdAt.toISOString(),
  };
}

grnRouter.get("/grn", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const poId = req.query.purchaseOrderId ? Number(req.query.purchaseOrderId) : null;
  const rows = await db
    .select()
    .from(grnTable)
    .where(
      poId
        ? and(eq(grnTable.organizationId, orgId), eq(grnTable.purchaseOrderId, poId))
        : eq(grnTable.organizationId, orgId),
    )
    .orderBy(desc(grnTable.createdAt));
  res.json(await Promise.all(rows.map(fmt)));
});

grnRouter.post("/grn", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const b = req.body ?? {};
  if (!b.warehouseId || !Array.isArray(b.items) || b.items.length === 0) {
    res.status(400).json({ error: "warehouseId and items required" });
    return;
  }
  // Validate warehouse belongs to org
  const [wh] = await db
    .select()
    .from(warehousesTable)
    .where(and(eq(warehousesTable.id, b.warehouseId), eq(warehousesTable.organizationId, orgId)));
  if (!wh) {
    res.status(400).json({ error: "Invalid warehouse" });
    return;
  }
  // Validate PO belongs to org (if provided)
  let poItemIds: number[] = [];
  if (b.purchaseOrderId) {
    const [po] = await db
      .select()
      .from(purchaseOrdersTable)
      .where(
        and(
          eq(purchaseOrdersTable.id, b.purchaseOrderId),
          eq(purchaseOrdersTable.organizationId, orgId),
        ),
      );
    if (!po) {
      res.status(400).json({ error: "Invalid purchase order" });
      return;
    }
    poItemIds = (
      await db
        .select({ id: purchaseOrderItemsTable.id })
        .from(purchaseOrderItemsTable)
        .where(eq(purchaseOrderItemsTable.purchaseOrderId, b.purchaseOrderId))
    ).map((p) => p.id);
  }
  // Validate all itemIds belong to org and any provided poItemIds belong to the given PO
  const incomingItems = b.items as Array<{
    poItemId?: number;
    itemId: number;
    quantity: number;
    unitCost: number;
  }>;
  const itemIdsToCheck = Array.from(new Set(incomingItems.map((i) => i.itemId)));
  if (itemIdsToCheck.length > 0) {
    const ownedItems = await db
      .select({ id: itemsTable.id })
      .from(itemsTable)
      .where(
        and(eq(itemsTable.organizationId, orgId), inArray(itemsTable.id, itemIdsToCheck)),
      );
    if (ownedItems.length !== itemIdsToCheck.length) {
      res.status(400).json({ error: "One or more items not found in this organization" });
      return;
    }
  }
  for (const it of incomingItems) {
    if (it.poItemId && !poItemIds.includes(it.poItemId)) {
      res.status(400).json({ error: "Invalid PO line reference" });
      return;
    }
    if (!(it.quantity > 0)) {
      res.status(400).json({ error: "Quantity must be positive" });
      return;
    }
  }
  const [g] = await db
    .insert(grnTable)
    .values({
      organizationId: orgId,
      grnNumber: genNumber(),
      purchaseOrderId: b.purchaseOrderId ?? null,
      warehouseId: b.warehouseId,
      receivedAt: b.receivedAt ? new Date(b.receivedAt) : new Date(),
      notes: b.notes ?? null,
      createdById: req.user!.userId,
    })
    .returning();

  for (const it of b.items as Array<{
    poItemId?: number;
    itemId: number;
    quantity: number;
    unitCost: number;
  }>) {
    await db.insert(grnItemsTable).values({
      grnId: g.id,
      poItemId: it.poItemId ?? null,
      itemId: it.itemId,
      quantity: String(it.quantity),
      unitCost: String(it.unitCost),
    });
    // Stock movement (also updates moving average cost)
    await recordMovement({
      organizationId: orgId,
      itemId: it.itemId,
      warehouseId: b.warehouseId,
      direction: "in",
      quantity: it.quantity,
      unitCost: it.unitCost,
      reason: "purchase",
      referenceType: "grn",
      referenceId: g.id,
      createdById: req.user!.userId,
    });
    // Update PO item receivedQuantity
    if (it.poItemId) {
      await db
        .update(purchaseOrderItemsTable)
        .set({ receivedQuantity: sql`${purchaseOrderItemsTable.receivedQuantity} + ${it.quantity}` })
        .where(eq(purchaseOrderItemsTable.id, it.poItemId));
    }
  }

  // Update PO status based on items
  if (b.purchaseOrderId) {
    const poItems = await db
      .select()
      .from(purchaseOrderItemsTable)
      .where(eq(purchaseOrderItemsTable.purchaseOrderId, b.purchaseOrderId));
    const allReceived = poItems.every((p) => Number(p.receivedQuantity) >= Number(p.quantity));
    const anyReceived = poItems.some((p) => Number(p.receivedQuantity) > 0);
    const newStatus = allReceived ? "received" : anyReceived ? "partial" : "sent";
    await db
      .update(purchaseOrdersTable)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(purchaseOrdersTable.id, b.purchaseOrderId));
  }
  await logAction(req, "CREATE", "grn", g.id, `Received ${b.items.length} items`);
  res.status(201).json(await fmt(g));
});

export default grnRouter;
