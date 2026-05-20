import { Router } from "express";
import {
  db,
  salesOrdersTable,
  salesOrderItemsTable,
  quotationsTable,
  quotationItemsTable,
  clientsTable,
  itemsTable,
  stockMovementsTable,
} from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";
import { recordMovement, ensureDefaultWarehouse } from "../lib/stockEngine";

async function dispatchStockForSO(
  organizationId: number,
  salesOrderId: number,
  direction: "in" | "out",
  reason: "sale" | "return",
  userId: number,
) {
  const items = await db
    .select()
    .from(salesOrderItemsTable)
    .where(eq(salesOrderItemsTable.salesOrderId, salesOrderId));
  if (items.length === 0) return;
  const warehouseId = await ensureDefaultWarehouse(organizationId);
  for (const it of items) {
    // Try to match SO item description to an item by name (best-effort)
    const [match] = await db
      .select()
      .from(itemsTable)
      .where(and(eq(itemsTable.organizationId, organizationId), eq(itemsTable.name, it.description)))
      .limit(1);
    if (!match) continue;
    await recordMovement({
      organizationId,
      itemId: match.id,
      warehouseId,
      direction,
      quantity: it.quantity,
      unitCost: Number(match.avgCost),
      reason,
      referenceType: "sales_order",
      referenceId: salesOrderId,
      createdById: userId,
    });
  }
}

async function reverseStockForSO(organizationId: number, salesOrderId: number, userId: number) {
  // Delete any prior sale movements for this SO (idempotent reversal)
  await db
    .delete(stockMovementsTable)
    .where(
      and(
        eq(stockMovementsTable.organizationId, organizationId),
        eq(stockMovementsTable.referenceType, "sales_order"),
        eq(stockMovementsTable.referenceId, salesOrderId),
      ),
    );
  void userId;
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

salesOrdersRouter.post("/sales-orders", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const b = req.body ?? {};
  const [s] = await db
    .insert(salesOrdersTable)
    .values({
      organizationId: orgId,
      orderNumber: genNumber(),
      clientId: b.clientId ?? null,
      status: b.status ?? "draft",
      expectedDeliveryAt: b.expectedDeliveryAt ? new Date(b.expectedDeliveryAt) : null,
      notes: b.notes ?? null,
      createdById: req.user!.userId,
    })
    .returning();
  if (Array.isArray(b.items) && b.items.length > 0) {
    await db.insert(salesOrderItemsTable).values(
      b.items.map((it: { description: string; quantity: number; unitPrice: number }) => ({
        salesOrderId: s.id,
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
  const [prev] = await db
    .select()
    .from(salesOrdersTable)
    .where(and(eq(salesOrdersTable.id, id), eq(salesOrdersTable.organizationId, orgId)));
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const f of ["clientId", "status", "notes"] as const) {
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
        b.items.map((it: { description: string; quantity: number; unitPrice: number }) => ({
          salesOrderId: id,
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
  if (prev && b.status !== undefined && b.status !== prev.status) {
    const becomingActive = ["confirmed", "in_production", "delivered"].includes(b.status);
    const wasActive = ["confirmed", "in_production", "delivered"].includes(prev.status);
    const becomingDead = ["cancelled", "draft"].includes(b.status);
    if (becomingActive && !wasActive) {
      try {
        await dispatchStockForSO(orgId, id, "out", "sale", req.user!.userId);
      } catch (e) {
        req.log.error({ err: e }, "stock dispatch failed for SO");
      }
    } else if (becomingDead && wasActive) {
      try {
        await reverseStockForSO(orgId, id, req.user!.userId);
      } catch (e) {
        req.log.error({ err: e }, "stock reversal failed for SO");
      }
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
