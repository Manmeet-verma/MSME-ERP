import { Router } from "express";
import {
  db,
  salesOrdersTable,
  salesOrderItemsTable,
  quotationsTable,
  quotationItemsTable,
  clientsTable,
  itemsTable,
  warehousesTable,
} from "@workspace/db";
import { and, eq, desc, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";
import { recordMovement, ensureDefaultWarehouse } from "../lib/stockEngine";

async function resolveSOWarehouse(organizationId: number, soWarehouseId: number | null): Promise<number> {
  if (soWarehouseId) return soWarehouseId;
  return ensureDefaultWarehouse(organizationId);
}

async function dispatchStockForSO(
  organizationId: number,
  salesOrderId: number,
  direction: "in" | "out",
  reason: "sale" | "return",
  userId: number,
) {
  const [so] = await db
    .select()
    .from(salesOrdersTable)
    .where(eq(salesOrdersTable.id, salesOrderId));
  if (!so) return;
  const items = await db
    .select()
    .from(salesOrderItemsTable)
    .where(eq(salesOrderItemsTable.salesOrderId, salesOrderId));
  if (items.length === 0) return;
  const warehouseId = await resolveSOWarehouse(organizationId, so.warehouseId ?? null);

  // Fetch linked items in one query for cost lookup
  const linkedIds = items.map((i) => i.itemId).filter((x): x is number => x != null);
  const linkedMap = linkedIds.length
    ? new Map(
        (
          await db
            .select()
            .from(itemsTable)
            .where(and(eq(itemsTable.organizationId, organizationId), inArray(itemsTable.id, linkedIds)))
        ).map((it) => [it.id, it]),
      )
    : new Map<number, typeof itemsTable.$inferSelect>();

  for (const it of items) {
    if (!it.itemId) continue;
    const linked = linkedMap.get(it.itemId);
    if (!linked) continue;
    await recordMovement({
      organizationId,
      itemId: it.itemId,
      warehouseId,
      direction,
      quantity: it.quantity,
      unitCost: Number(linked.avgCost),
      reason,
      referenceType: "sales_order",
      referenceId: salesOrderId,
      createdById: userId,
    });
  }
}

const salesOrdersRouter = Router();

function genNumber() {
  const d = new Date();
  return `SO-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}-${Math.floor(Math.random() * 9000) + 1000}`;
}

async function fmt(s: typeof salesOrdersTable.$inferSelect) {
  const client = s.clientId
    ? (await db.select().from(clientsTable).where(eq(clientsTable.id, s.clientId)))[0]
    : null;
  return {
    id: s.id,
    orderNumber: s.orderNumber,
    clientId: s.clientId ?? null,
    clientName: client?.name ?? null,
    quotationId: s.quotationId ?? null,
    warehouseId: s.warehouseId ?? null,
    status: s.status,
    subtotal: Number(s.subtotal),
    discountAmount: Number(s.discountAmount),
    taxAmount: Number(s.taxAmount),
    total: Number(s.total),
    expectedDeliveryAt: s.expectedDeliveryAt?.toISOString() ?? null,
    notes: s.notes ?? null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

async function recalc(soId: number) {
  const items = await db.select().from(salesOrderItemsTable).where(eq(salesOrderItemsTable.salesOrderId, soId));
  const subtotal = items.reduce((acc, i) => acc + Number(i.totalPrice), 0);
  const tax = subtotal * 0.18;
  await db
    .update(salesOrdersTable)
    .set({
      subtotal: subtotal.toFixed(2),
      taxAmount: tax.toFixed(2),
      total: (subtotal + tax).toFixed(2),
      updatedAt: new Date(),
    })
    .where(eq(salesOrdersTable.id, soId));
}

salesOrdersRouter.get("/sales-orders", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const rows = await db
    .select()
    .from(salesOrdersTable)
    .where(eq(salesOrdersTable.organizationId, orgId))
    .orderBy(desc(salesOrdersTable.createdAt));
  res.json(await Promise.all(rows.map(fmt)));
});

async function validateSOOwnership(
  orgId: number,
  b: { warehouseId?: number | null; items?: Array<{ itemId?: number | null }> },
): Promise<string | null> {
  if (b.warehouseId) {
    const [w] = await db
      .select()
      .from(warehousesTable)
      .where(and(eq(warehousesTable.id, b.warehouseId), eq(warehousesTable.organizationId, orgId)));
    if (!w) return "Invalid warehouse";
  }
  if (Array.isArray(b.items)) {
    const ids = Array.from(
      new Set(b.items.map((i) => i.itemId).filter((x): x is number => x != null)),
    );
    if (ids.length > 0) {
      const owned = await db
        .select({ id: itemsTable.id })
        .from(itemsTable)
        .where(and(eq(itemsTable.organizationId, orgId), inArray(itemsTable.id, ids)));
      if (owned.length !== ids.length) return "One or more items not found in this organization";
    }
  }
  return null;
}

salesOrdersRouter.post("/sales-orders", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const b = req.body ?? {};
  const ownErr = await validateSOOwnership(orgId, b);
  if (ownErr) {
    res.status(400).json({ error: ownErr });
    return;
  }
  const [s] = await db
    .insert(salesOrdersTable)
    .values({
      organizationId: orgId,
      orderNumber: genNumber(),
      clientId: b.clientId ?? null,
      warehouseId: b.warehouseId ?? null,
      status: b.status ?? "draft",
      expectedDeliveryAt: b.expectedDeliveryAt ? new Date(b.expectedDeliveryAt) : null,
      notes: b.notes ?? null,
      createdById: req.user!.userId,
    })
    .returning();
  if (Array.isArray(b.items) && b.items.length > 0) {
    await db.insert(salesOrderItemsTable).values(
      b.items.map((it: { itemId?: number | null; description: string; quantity: number; unitPrice: number }) => ({
        salesOrderId: s.id,
        itemId: it.itemId ?? null,
        description: it.description,
        quantity: it.quantity,
        unitPrice: String(it.unitPrice),
        totalPrice: (it.quantity * it.unitPrice).toFixed(2),
      })),
    );
    await recalc(s.id);
  }
  const [updated] = await db.select().from(salesOrdersTable).where(eq(salesOrdersTable.id, s.id));
  await logAction(req, "CREATE", "sales_order", s.id);
  res.status(201).json(await fmt(updated));
});

salesOrdersRouter.get("/sales-orders/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  const [s] = await db
    .select()
    .from(salesOrdersTable)
    .where(and(eq(salesOrdersTable.id, id), eq(salesOrdersTable.organizationId, orgId)));
  if (!s) {
    res.status(404).json({ error: "Sales order not found" });
    return;
  }
  const items = await db.select().from(salesOrderItemsTable).where(eq(salesOrderItemsTable.salesOrderId, id));
  res.json({
    ...(await fmt(s)),
    items: items.map((i) => ({
      id: i.id,
      itemId: i.itemId ?? null,
      description: i.description,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      totalPrice: Number(i.totalPrice),
    })),
  });
});

salesOrdersRouter.patch("/sales-orders/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  const b = req.body ?? {};
  const ownErr = await validateSOOwnership(orgId, b);
  if (ownErr) {
    res.status(400).json({ error: ownErr });
    return;
  }
  const [prev] = await db
    .select()
    .from(salesOrdersTable)
    .where(and(eq(salesOrdersTable.id, id), eq(salesOrdersTable.organizationId, orgId)));
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const f of ["clientId", "warehouseId", "status", "notes"] as const) {
    if (b[f] !== undefined) updates[f] = b[f];
  }
  if (b.expectedDeliveryAt !== undefined) updates.expectedDeliveryAt = b.expectedDeliveryAt ? new Date(b.expectedDeliveryAt) : null;
  const [s] = await db
    .update(salesOrdersTable)
    .set(updates)
    .where(and(eq(salesOrdersTable.id, id), eq(salesOrdersTable.organizationId, orgId)))
    .returning();
  if (!s) {
    res.status(404).json({ error: "Sales order not found" });
    return;
  }
  // Replace items first so stock dispatch reflects the latest lines
  if (Array.isArray(b.items)) {
    await db.delete(salesOrderItemsTable).where(eq(salesOrderItemsTable.salesOrderId, id));
    if (b.items.length > 0) {
      await db.insert(salesOrderItemsTable).values(
        b.items.map((it: { itemId?: number | null; description: string; quantity: number; unitPrice: number }) => ({
          salesOrderId: id,
          itemId: it.itemId ?? null,
          description: it.description,
          quantity: it.quantity,
          unitPrice: String(it.unitPrice),
          totalPrice: (it.quantity * it.unitPrice).toFixed(2),
        })),
      );
    }
    await recalc(id);
  }
  // Stock dispatch on status transitions (after item replacement)
  // Failures must bubble up so we don't leave an SO confirmed without stock movement.
  if (prev && b.status !== undefined && b.status !== prev.status) {
    const becomingActive = ["confirmed", "in_production", "delivered"].includes(b.status);
    const wasActive = ["confirmed", "in_production", "delivered"].includes(prev.status);
    const becomingDead = ["cancelled", "draft"].includes(b.status);
    try {
      if (becomingActive && !wasActive) {
        await dispatchStockForSO(orgId, id, "out", "sale", req.user!.userId);
      } else if (becomingDead && wasActive) {
        // Compensating IN movements preserve the ledger (reason=return)
        await dispatchStockForSO(orgId, id, "in", "return", req.user!.userId);
      }
    } catch (e) {
      // Roll back the status change so SO + stock stay consistent
      await db
        .update(salesOrdersTable)
        .set({ status: prev.status, updatedAt: new Date() })
        .where(eq(salesOrdersTable.id, id));
      req.log.error({ err: e }, "stock dispatch failed; SO status reverted");
      res.status(500).json({ error: "Stock movement failed; sales order status was reverted" });
      return;
    }
  }
  const [updated] = await db.select().from(salesOrdersTable).where(eq(salesOrdersTable.id, id));
  res.json(await fmt(updated));
});

salesOrdersRouter.post("/sales-orders/from-quotation/:quotationId", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const qid = Number(req.params.quotationId);
  const [q] = await db
    .select()
    .from(quotationsTable)
    .where(and(eq(quotationsTable.id, qid), eq(quotationsTable.organizationId, orgId)));
  if (!q) {
    res.status(404).json({ error: "Quotation not found" });
    return;
  }
  const items = await db.select().from(quotationItemsTable).where(eq(quotationItemsTable.quotationId, qid));
  const [s] = await db
    .insert(salesOrdersTable)
    .values({
      organizationId: orgId,
      orderNumber: genNumber(),
      clientId: q.clientId,
      quotationId: qid,
      status: "confirmed",
      subtotal: q.subtotal,
      discountAmount: q.discountAmount,
      taxAmount: q.taxAmount,
      total: q.total,
      createdById: req.user!.userId,
    })
    .returning();
  if (items.length > 0) {
    await db.insert(salesOrderItemsTable).values(
      items.map((i) => ({
        salesOrderId: s.id,
        // Quotation items don't link to inventory items yet — carried as null.
        itemId: null,
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
      })),
    );
  }
  await logAction(req, "PROMOTE", "sales_order", s.id, `From quotation ${q.quotationNumber}`);
  res.status(201).json(await fmt(s));
});

export default salesOrdersRouter;
