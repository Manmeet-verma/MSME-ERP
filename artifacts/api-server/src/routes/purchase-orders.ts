import { Router } from "express";
import {
  db,
  purchaseOrdersTable,
  purchaseOrderItemsTable,
  vendorsTable,
  itemsTable,
} from "@workspace/db";
import { and, eq, desc, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";

const purchaseOrdersRouter = Router();

function genNumber() {
  const d = new Date();
  return `PO-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}-${Math.floor(Math.random() * 9000) + 1000}`;
}

async function fmt(p: typeof purchaseOrdersTable.$inferSelect) {
  const vendor = p.vendorId
    ? (await db.select().from(vendorsTable).where(eq(vendorsTable.id, p.vendorId)))[0]
    : null;
  return {
    id: p.id,
    poNumber: p.poNumber,
    vendorId: p.vendorId ?? null,
    vendorName: vendor?.name ?? null,
    warehouseId: p.warehouseId ?? null,
    status: p.status,
    expectedDate: p.expectedDate?.toISOString() ?? null,
    subtotal: Number(p.subtotal),
    taxAmount: Number(p.taxAmount),
    total: Number(p.total),
    notes: p.notes ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

async function recalc(poId: number, taxRate = 18) {
  const items = await db
    .select()
    .from(purchaseOrderItemsTable)
    .where(eq(purchaseOrderItemsTable.purchaseOrderId, poId));
  const subtotal = items.reduce((s, i) => s + Number(i.totalPrice), 0);
  const tax = (subtotal * taxRate) / 100;
  await db
    .update(purchaseOrdersTable)
    .set({
      subtotal: subtotal.toFixed(2),
      taxAmount: tax.toFixed(2),
      total: (subtotal + tax).toFixed(2),
      updatedAt: new Date(),
    })
    .where(eq(purchaseOrdersTable.id, poId));
}

purchaseOrdersRouter.get("/purchase-orders", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const rows = await db
    .select()
    .from(purchaseOrdersTable)
    .where(eq(purchaseOrdersTable.organizationId, orgId))
    .orderBy(desc(purchaseOrdersTable.createdAt));
  res.json(await Promise.all(rows.map(fmt)));
});

purchaseOrdersRouter.get("/purchase-orders/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  const [p] = await db
    .select()
    .from(purchaseOrdersTable)
    .where(and(eq(purchaseOrdersTable.id, id), eq(purchaseOrdersTable.organizationId, orgId)));
  if (!p) {
    res.status(404).json({ error: "Purchase order not found" });
    return;
  }
  const items = await db
    .select()
    .from(purchaseOrderItemsTable)
    .where(eq(purchaseOrderItemsTable.purchaseOrderId, id));
  const itemIds = items.map((i) => i.itemId).filter((x): x is number => x != null);
  const itemsMap = itemIds.length
    ? new Map(
        (await db.select().from(itemsTable).where(inArray(itemsTable.id, itemIds))).map((it) => [
          it.id,
          it,
        ]),
      )
    : new Map();
  res.json({
    ...(await fmt(p)),
    items: items.map((i) => {
      const it = i.itemId ? itemsMap.get(i.itemId) : null;
      return {
        id: i.id,
        itemId: i.itemId ?? null,
        itemName: it?.name ?? null,
        itemSku: it?.sku ?? null,
        description: i.description,
        quantity: Number(i.quantity),
        receivedQuantity: Number(i.receivedQuantity),
        unitPrice: Number(i.unitPrice),
        totalPrice: Number(i.totalPrice),
      };
    }),
  });
});

purchaseOrdersRouter.post("/purchase-orders", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const b = req.body ?? {};
  const [p] = await db
    .insert(purchaseOrdersTable)
    .values({
      organizationId: orgId,
      poNumber: genNumber(),
      vendorId: b.vendorId ?? null,
      warehouseId: b.warehouseId ?? null,
      status: b.status ?? "draft",
      expectedDate: b.expectedDate ? new Date(b.expectedDate) : null,
      notes: b.notes ?? null,
      createdById: req.user!.userId,
    })
    .returning();
  if (Array.isArray(b.items) && b.items.length > 0) {
    await db.insert(purchaseOrderItemsTable).values(
      b.items.map(
        (it: { itemId?: number; description: string; quantity: number; unitPrice: number }) => ({
          purchaseOrderId: p.id,
          itemId: it.itemId ?? null,
          description: it.description,
          quantity: String(it.quantity),
          receivedQuantity: "0",
          unitPrice: String(it.unitPrice),
          totalPrice: (it.quantity * it.unitPrice).toFixed(2),
        }),
      ),
    );
    await recalc(p.id, Number(b.taxRate ?? 18));
  }
  const [u] = await db.select().from(purchaseOrdersTable).where(eq(purchaseOrdersTable.id, p.id));
  await logAction(req, "CREATE", "purchase_order", p.id);
  res.status(201).json(await fmt(u));
});

purchaseOrdersRouter.patch("/purchase-orders/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  const b = req.body ?? {};
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const f of ["vendorId", "warehouseId", "status", "notes"] as const) {
    if (b[f] !== undefined) updates[f] = b[f];
  }
  if (b.expectedDate !== undefined) updates.expectedDate = b.expectedDate ? new Date(b.expectedDate) : null;
  const [p] = await db
    .update(purchaseOrdersTable)
    .set(updates)
    .where(and(eq(purchaseOrdersTable.id, id), eq(purchaseOrdersTable.organizationId, orgId)))
    .returning();
  if (!p) {
    res.status(404).json({ error: "Purchase order not found" });
    return;
  }
  if (Array.isArray(b.items)) {
    await db.delete(purchaseOrderItemsTable).where(eq(purchaseOrderItemsTable.purchaseOrderId, id));
    if (b.items.length > 0) {
      await db.insert(purchaseOrderItemsTable).values(
        b.items.map(
          (it: { itemId?: number; description: string; quantity: number; unitPrice: number }) => ({
            purchaseOrderId: id,
            itemId: it.itemId ?? null,
            description: it.description,
            quantity: String(it.quantity),
            receivedQuantity: "0",
            unitPrice: String(it.unitPrice),
            totalPrice: (it.quantity * it.unitPrice).toFixed(2),
          }),
        ),
      );
    }
    await recalc(id, Number(b.taxRate ?? 18));
  }
  const [u] = await db.select().from(purchaseOrdersTable).where(eq(purchaseOrdersTable.id, id));
  await logAction(req, "UPDATE", "purchase_order", id);
  res.json(await fmt(u));
});

export default purchaseOrdersRouter;
