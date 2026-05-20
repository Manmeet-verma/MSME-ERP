import { Router } from "express";
import {
  db,
  vendorBillsTable,
  vendorBillItemsTable,
  vendorsTable,
  purchaseOrdersTable,
  purchaseOrderItemsTable,
} from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";

const vendorBillsRouter = Router();

function genNumber() {
  const d = new Date();
  return `BILL-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}-${Math.floor(Math.random() * 9000) + 1000}`;
}

type BillStatus = "draft" | "open" | "partial" | "paid" | "overdue" | "cancelled";

function deriveStatus(total: number, paid: number, dueDate: Date | null, current: string): BillStatus {
  if (current === "draft" || current === "cancelled") return current;
  if (paid >= total && total > 0) return "paid";
  if (dueDate && dueDate < new Date() && paid < total) return "overdue";
  if (paid > 0 && paid < total) return "partial";
  return "open";
}

async function fmt(b: typeof vendorBillsTable.$inferSelect) {
  const vendor = b.vendorId
    ? (await db.select().from(vendorsTable).where(eq(vendorsTable.id, b.vendorId)))[0]
    : null;
  return {
    id: b.id,
    billNumber: b.billNumber,
    vendorId: b.vendorId ?? null,
    vendorName: vendor?.name ?? null,
    purchaseOrderId: b.purchaseOrderId ?? null,
    status: b.status,
    issueDate: b.issueDate.toISOString(),
    dueDate: b.dueDate?.toISOString() ?? null,
    subtotal: Number(b.subtotal),
    taxAmount: Number(b.taxAmount),
    total: Number(b.total),
    amountPaid: Number(b.amountPaid),
    notes: b.notes ?? null,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}

async function recalc(billId: number, taxRate = 18) {
  const items = await db
    .select()
    .from(vendorBillItemsTable)
    .where(eq(vendorBillItemsTable.vendorBillId, billId));
  const subtotal = items.reduce((s, i) => s + Number(i.totalPrice), 0);
  const tax = (subtotal * taxRate) / 100;
  const total = subtotal + tax;
  const [b] = await db.select().from(vendorBillsTable).where(eq(vendorBillsTable.id, billId));
  const status = deriveStatus(total, Number(b.amountPaid), b.dueDate, b.status);
  await db
    .update(vendorBillsTable)
    .set({
      subtotal: subtotal.toFixed(2),
      taxAmount: tax.toFixed(2),
      total: total.toFixed(2),
      status,
      updatedAt: new Date(),
    })
    .where(eq(vendorBillsTable.id, billId));
}

vendorBillsRouter.get("/vendor-bills", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const rows = await db
    .select()
    .from(vendorBillsTable)
    .where(eq(vendorBillsTable.organizationId, orgId))
    .orderBy(desc(vendorBillsTable.createdAt));
  res.json(await Promise.all(rows.map(fmt)));
});

vendorBillsRouter.get("/vendor-bills/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  const [b] = await db
    .select()
    .from(vendorBillsTable)
    .where(and(eq(vendorBillsTable.id, id), eq(vendorBillsTable.organizationId, orgId)));
  if (!b) {
    res.status(404).json({ error: "Vendor bill not found" });
    return;
  }
  const items = await db
    .select()
    .from(vendorBillItemsTable)
    .where(eq(vendorBillItemsTable.vendorBillId, id));
  res.json({
    ...(await fmt(b)),
    items: items.map((i) => ({
      id: i.id,
      itemId: i.itemId ?? null,
      description: i.description,
      quantity: Number(i.quantity),
      unitPrice: Number(i.unitPrice),
      totalPrice: Number(i.totalPrice),
    })),
  });
});

vendorBillsRouter.post("/vendor-bills", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const b = req.body ?? {};
  let items: Array<{ itemId?: number; description: string; quantity: number; unitPrice: number }> =
    Array.isArray(b.items) ? b.items : [];

  // Validate vendor belongs to this org
  if (b.vendorId) {
    const [v] = await db
      .select()
      .from(vendorsTable)
      .where(and(eq(vendorsTable.id, b.vendorId), eq(vendorsTable.organizationId, orgId)));
    if (!v) {
      res.status(400).json({ error: "Invalid vendor" });
      return;
    }
  }

  // Auto-populate from PO if provided and no items given (also validates PO ownership)
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
  }
  if (b.purchaseOrderId && items.length === 0) {
    const poItems = await db
      .select()
      .from(purchaseOrderItemsTable)
      .where(eq(purchaseOrderItemsTable.purchaseOrderId, b.purchaseOrderId));
    items = poItems.map((p) => ({
      itemId: p.itemId ?? undefined,
      description: p.description,
      quantity: Number(p.quantity),
      unitPrice: Number(p.unitPrice),
    }));
  }

  const [bill] = await db
    .insert(vendorBillsTable)
    .values({
      organizationId: orgId,
      billNumber: b.billNumber ?? genNumber(),
      vendorId: b.vendorId ?? null,
      purchaseOrderId: b.purchaseOrderId ?? null,
      status: b.status ?? "open",
      issueDate: b.issueDate ? new Date(b.issueDate) : new Date(),
      dueDate: b.dueDate ? new Date(b.dueDate) : null,
      amountPaid: b.amountPaid != null ? String(b.amountPaid) : "0",
      notes: b.notes ?? null,
      createdById: req.user!.userId,
    })
    .returning();

  if (items.length > 0) {
    await db.insert(vendorBillItemsTable).values(
      items.map((it) => ({
        vendorBillId: bill.id,
        itemId: it.itemId ?? null,
        description: it.description,
        quantity: String(it.quantity),
        unitPrice: String(it.unitPrice),
        totalPrice: (it.quantity * it.unitPrice).toFixed(2),
      })),
    );
    await recalc(bill.id, Number(b.taxRate ?? 18));
  }

  const [u] = await db.select().from(vendorBillsTable).where(eq(vendorBillsTable.id, bill.id));
  await logAction(req, "CREATE", "vendor_bill", bill.id);
  res.status(201).json(await fmt(u));
});

vendorBillsRouter.patch("/vendor-bills/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  const b = req.body ?? {};
  // Validate any FK changes belong to this org
  if (b.vendorId !== undefined && b.vendorId !== null) {
    const [v] = await db
      .select()
      .from(vendorsTable)
      .where(and(eq(vendorsTable.id, b.vendorId), eq(vendorsTable.organizationId, orgId)));
    if (!v) {
      res.status(400).json({ error: "Invalid vendor" });
      return;
    }
  }
  if (b.purchaseOrderId !== undefined && b.purchaseOrderId !== null) {
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
  }
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const f of ["billNumber", "vendorId", "purchaseOrderId", "status", "notes"] as const) {
    if (b[f] !== undefined) updates[f] = b[f];
  }
  if (b.dueDate !== undefined) updates.dueDate = b.dueDate ? new Date(b.dueDate) : null;
  if (b.issueDate !== undefined) updates.issueDate = b.issueDate ? new Date(b.issueDate) : new Date();
  if (b.amountPaid !== undefined && b.amountPaid !== null) updates.amountPaid = String(b.amountPaid);
  const [bill] = await db
    .update(vendorBillsTable)
    .set(updates)
    .where(and(eq(vendorBillsTable.id, id), eq(vendorBillsTable.organizationId, orgId)))
    .returning();
  if (!bill) {
    res.status(404).json({ error: "Vendor bill not found" });
    return;
  }
  if (Array.isArray(b.items)) {
    await db.delete(vendorBillItemsTable).where(eq(vendorBillItemsTable.vendorBillId, id));
    if (b.items.length > 0) {
      await db.insert(vendorBillItemsTable).values(
        b.items.map(
          (it: { itemId?: number; description: string; quantity: number; unitPrice: number }) => ({
            vendorBillId: id,
            itemId: it.itemId ?? null,
            description: it.description,
            quantity: String(it.quantity),
            unitPrice: String(it.unitPrice),
            totalPrice: (it.quantity * it.unitPrice).toFixed(2),
          }),
        ),
      );
    }
  }
  await recalc(id, Number(b.taxRate ?? 18));
  const [u] = await db.select().from(vendorBillsTable).where(eq(vendorBillsTable.id, id));
  await logAction(req, "UPDATE", "vendor_bill", id);
  res.json(await fmt(u));
});

export default vendorBillsRouter;
