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
import { recordMovement, ensureDefaultWarehouse, type DbOrTx } from "../lib/stockEngine";

async function resolveSOWarehouse(organizationId: number, soWarehouseId: number | null): Promise<number> {
  if (soWarehouseId) return soWarehouseId;
  return ensureDefaultWarehouse(organizationId);
}

/**
 * Post stock movements for an explicit snapshot of SO lines, in an explicit warehouse,
 * optionally under a transaction. Reversal callers pass the PRE-CHANGE snapshot (lines +
 * warehouse the stock was originally deducted from) so the ledger is symmetric.
 */
async function postSOMovements(opts: {
  organizationId: number;
  salesOrderId: number;
  lines: Array<{ itemId: number | null; quantity: number }>;
  warehouseId: number;
  direction: "in" | "out";
  reason: "sale" | "return";
  userId: number;
  executor: DbOrTx;
}) {
  const linkedIds = opts.lines.map((i) => i.itemId).filter((x): x is number => x != null);
  if (linkedIds.length === 0) return;
  const linkedMap = new Map(
    (
      await (opts.executor as typeof db)
        .select()
        .from(itemsTable)
        .where(and(eq(itemsTable.organizationId, opts.organizationId), inArray(itemsTable.id, linkedIds)))
    ).map((it) => [it.id, it]),
  );
  for (const it of opts.lines) {
    if (!it.itemId) continue;
    const linked = linkedMap.get(it.itemId);
    if (!linked) continue;
    await recordMovement({
      organizationId: opts.organizationId,
      itemId: it.itemId,
      warehouseId: opts.warehouseId,
      direction: opts.direction,
      quantity: it.quantity,
      unitCost: Number(linked.avgCost),
      reason: opts.reason,
      referenceType: "sales_order",
      referenceId: opts.salesOrderId,
      createdById: opts.userId,
      executor: opts.executor,
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
  // Force new SOs to start in `draft`. Confirmation (which deducts stock) must
  // happen via PATCH so the ledger update runs through a single, audited path.
  if (b.status !== undefined && b.status !== "draft") {
    res
      .status(400)
      .json({ error: "Sales orders must be created in draft. Confirm via PATCH to deduct stock." });
    return;
  }
  const [s] = await db
    .insert(salesOrdersTable)
    .values({
      organizationId: orgId,
      orderNumber: genNumber(),
      clientId: b.clientId ?? null,
      warehouseId: b.warehouseId ?? null,
      status: "draft",
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
  if (!prev) {
    res.status(404).json({ error: "Sales order not found" });
    return;
  }
  // Conflict-check BEFORE any writes
  const wasActive = ["confirmed", "in_production", "delivered"].includes(prev.status);
  const stillActive =
    b.status === undefined || ["confirmed", "in_production", "delivered"].includes(b.status);
  if (Array.isArray(b.items) && wasActive && stillActive) {
    res.status(409).json({ error: "Revert sales order to draft before editing line items" });
    return;
  }
  // Warehouse changes on active SOs would desync per-warehouse ledger balances
  // (deduction warehouse ≠ restoration warehouse). Require a draft revert.
  if (
    b.warehouseId !== undefined &&
    b.warehouseId !== prev.warehouseId &&
    wasActive &&
    stillActive
  ) {
    res
      .status(409)
      .json({ error: "Revert sales order to draft before changing warehouse" });
    return;
  }
  // Snapshot pre-change lines + warehouse for compensating movements
  const prevLines = (
    await db
      .select()
      .from(salesOrderItemsTable)
      .where(eq(salesOrderItemsTable.salesOrderId, id))
  ).map((l) => ({ itemId: l.itemId ?? null, quantity: l.quantity }));
  const prevWarehouseId = await resolveSOWarehouse(orgId, prev.warehouseId ?? null);

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const f of ["clientId", "warehouseId", "status", "notes"] as const) {
    if (b[f] !== undefined) updates[f] = b[f];
  }
  if (b.expectedDeliveryAt !== undefined) updates.expectedDeliveryAt = b.expectedDeliveryAt ? new Date(b.expectedDeliveryAt) : null;
  // SO header update + item replacement + stock compensation must be atomic.
  const becomingActive =
    b.status !== undefined &&
    !wasActive &&
    ["confirmed", "in_production", "delivered"].includes(b.status);
  const becomingDead =
    b.status !== undefined && wasActive && ["cancelled", "draft"].includes(b.status);
  try {
    await db.transaction(async (tx) => {
      // 1) Apply header updates inside the tx
      await tx
        .update(salesOrdersTable)
        .set(updates)
        .where(
          and(eq(salesOrdersTable.id, id), eq(salesOrdersTable.organizationId, orgId)),
        );
      if (becomingDead) {
        // Reverse against the PRE-CHANGE snapshot (the lines/warehouse the
        // stock was actually deducted from on the prior confirm).
        await postSOMovements({
          organizationId: orgId,
          salesOrderId: id,
          lines: prevLines,
          warehouseId: prevWarehouseId,
          direction: "in",
          reason: "return",
          userId: req.user!.userId,
          executor: tx,
        });
      }
      if (Array.isArray(b.items)) {
        await tx.delete(salesOrderItemsTable).where(eq(salesOrderItemsTable.salesOrderId, id));
        if (b.items.length > 0) {
          await tx.insert(salesOrderItemsTable).values(
            b.items.map(
              (it: { itemId?: number | null; description: string; quantity: number; unitPrice: number }) => ({
                salesOrderId: id,
                itemId: it.itemId ?? null,
                description: it.description,
                quantity: it.quantity,
                unitPrice: String(it.unitPrice),
                totalPrice: (it.quantity * it.unitPrice).toFixed(2),
              }),
            ),
          );
        }
        // Recompute totals inline within the same tx
        const lines = await tx
          .select()
          .from(salesOrderItemsTable)
          .where(eq(salesOrderItemsTable.salesOrderId, id));
        const subtotal = lines.reduce((acc, l) => acc + Number(l.totalPrice), 0);
        const total = subtotal; // no discount/tax on SO directly
        await tx
          .update(salesOrdersTable)
          .set({ subtotal: subtotal.toFixed(2), total: total.toFixed(2), updatedAt: new Date() })
          .where(eq(salesOrdersTable.id, id));
      }
      if (becomingActive) {
        // Forward dispatch uses CURRENT lines + (possibly new) warehouse
        const currentLines = (
          await tx
            .select()
            .from(salesOrderItemsTable)
            .where(eq(salesOrderItemsTable.salesOrderId, id))
        ).map((l) => ({ itemId: l.itemId ?? null, quantity: l.quantity }));
        const [refreshed] = await tx
          .select()
          .from(salesOrdersTable)
          .where(eq(salesOrdersTable.id, id));
        const whId = await resolveSOWarehouse(orgId, refreshed.warehouseId ?? null);
        await postSOMovements({
          organizationId: orgId,
          salesOrderId: id,
          lines: currentLines,
          warehouseId: whId,
          direction: "out",
          reason: "sale",
          userId: req.user!.userId,
          executor: tx,
        });
      }
    });
  } catch (e) {
    req.log.error({ err: e }, "SO patch transaction failed; nothing committed");
    res.status(500).json({ error: "Sales order update failed; no changes applied" });
    return;
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
      // Created as draft; user must confirm via PATCH (which will deduct stock
      // for any lines explicitly linked to inventory items).
      status: "draft",
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
