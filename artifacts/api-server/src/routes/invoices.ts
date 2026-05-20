import { Router } from "express";
import {
  db,
  invoicesTable,
  invoiceItemsTable,
  paymentsTable,
  salesOrdersTable,
  salesOrderItemsTable,
  clientsTable,
  organizationsTable,
} from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";
import { calcGst, round2 } from "../lib/gst";
import { reverseAndRepost } from "../lib/accounting";

const invoicesRouter = Router();

function genNumber() {
  const d = new Date();
  return `INV-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}-${Math.floor(Math.random() * 9000) + 1000}`;
}

async function fmt(inv: typeof invoicesTable.$inferSelect) {
  const client = inv.clientId
    ? (await db.select().from(clientsTable).where(eq(clientsTable.id, inv.clientId)))[0]
    : null;
  return {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    clientId: inv.clientId ?? null,
    clientName: client?.name ?? null,
    salesOrderId: inv.salesOrderId ?? null,
    status: inv.status,
    issueDate: inv.issueDate.toISOString(),
    dueDate: inv.dueDate?.toISOString() ?? null,
    sellerState: inv.sellerState ?? null,
    buyerState: inv.buyerState ?? null,
    subtotal: Number(inv.subtotal),
    discountAmount: Number(inv.discountAmount),
    taxableAmount: Number(inv.taxableAmount),
    cgst: Number(inv.cgst),
    sgst: Number(inv.sgst),
    igst: Number(inv.igst),
    taxRate: Number(inv.taxRate),
    total: Number(inv.total),
    amountPaid: Number(inv.amountPaid),
    notes: inv.notes ?? null,
    terms: inv.terms ?? null,
    createdAt: inv.createdAt.toISOString(),
    updatedAt: inv.updatedAt.toISOString(),
  };
}

async function recalc(invoiceId: number) {
  const [inv] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, invoiceId));
  if (!inv) return;
  const items = await db.select().from(invoiceItemsTable).where(eq(invoiceItemsTable.invoiceId, invoiceId));
  const subtotal = items.reduce((acc, i) => acc + Number(i.totalPrice), 0);
  const discountAmount = Number(inv.discountAmount);
  const taxable = Math.max(0, subtotal - discountAmount);
  const taxRate = Number(inv.taxRate);
  const gst = calcGst(taxable, taxRate, inv.sellerState, inv.buyerState);
  const total = round2(taxable + gst.total);
  // Update paid + status
  const pays = await db.select().from(paymentsTable).where(eq(paymentsTable.invoiceId, invoiceId));
  const paid = pays.reduce((acc, p) => acc + Number(p.amount), 0);
  let status: typeof inv.status = inv.status;
  if (paid >= total && total > 0) status = "paid";
  else if (paid > 0) status = "partial";
  else if (inv.dueDate && new Date(inv.dueDate) < new Date()) status = "overdue";
  else if (status === "paid" || status === "partial") status = "sent";
  await db
    .update(invoicesTable)
    .set({
      subtotal: subtotal.toFixed(2),
      taxableAmount: taxable.toFixed(2),
      cgst: gst.cgst.toFixed(2),
      sgst: gst.sgst.toFixed(2),
      igst: gst.igst.toFixed(2),
      total: total.toFixed(2),
      amountPaid: paid.toFixed(2),
      status,
      updatedAt: new Date(),
    })
    .where(eq(invoicesTable.id, invoiceId));
  // Auto-post journal: Dr AR, Cr Sales Revenue, Cr GST Output (skip if cancelled/draft)
  const isPostable = status !== "draft" && status !== "cancelled";
  await reverseAndRepost(
    inv.organizationId,
    "invoice",
    invoiceId,
    async () => {
      if (!isPostable || total <= 0) return null;
      const taxTotal = round2(gst.cgst + gst.sgst + gst.igst);
      const lines = [
        { accountCode: "1100", debit: total, description: `Invoice ${inv.invoiceNumber}` },
        { accountCode: "4000", credit: taxable, description: "Sales revenue" },
      ];
      if (taxTotal > 0) lines.push({ accountCode: "2100", credit: taxTotal, description: "GST output" });
      return lines;
    },
    { entryDate: inv.issueDate, memo: `Invoice ${inv.invoiceNumber}` },
  );
}

invoicesRouter.get("/invoices", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  let rows = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.organizationId, orgId))
    .orderBy(desc(invoicesTable.createdAt));
  const statusQ = req.query.status as string | undefined;
  if (statusQ) rows = rows.filter((r) => r.status === statusQ);
  res.json(await Promise.all(rows.map(fmt)));
});

invoicesRouter.post("/invoices", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const b = req.body ?? {};
  const [org] = await db.select().from(organizationsTable).where(eq(organizationsTable.id, orgId));
  let buyerState: string | null = null;
  if (b.clientId) {
    const [c] = await db.select().from(clientsTable).where(eq(clientsTable.id, b.clientId));
    buyerState = c?.state ?? null;
  }
  const [inv] = await db
    .insert(invoicesTable)
    .values({
      organizationId: orgId,
      invoiceNumber: genNumber(),
      clientId: b.clientId ?? null,
      salesOrderId: b.salesOrderId ?? null,
      status: "draft",
      issueDate: new Date(),
      dueDate: b.dueDate ? new Date(b.dueDate) : null,
      sellerState: org?.state ?? null,
      buyerState,
      taxRate: b.taxRate !== undefined && b.taxRate !== null ? String(b.taxRate) : "18",
      notes: b.notes ?? null,
      terms: b.terms ?? "Payment due within 30 days. GST as applicable.",
      createdById: req.user!.userId,
    })
    .returning();
  if (Array.isArray(b.items) && b.items.length > 0) {
    await db.insert(invoiceItemsTable).values(
      b.items.map((it: { description: string; quantity: number; unitPrice: number }) => ({
        invoiceId: inv.id,
        description: it.description,
        quantity: it.quantity,
        unitPrice: String(it.unitPrice),
        totalPrice: (it.quantity * it.unitPrice).toFixed(2),
      })),
    );
  }
  await recalc(inv.id);
  const [updated] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, inv.id));
  await logAction(req, "CREATE", "invoice", inv.id);
  res.status(201).json(await fmt(updated));
});

invoicesRouter.get("/invoices/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  const [inv] = await db
    .select()
    .from(invoicesTable)
    .where(and(eq(invoicesTable.id, id), eq(invoicesTable.organizationId, orgId)));
  if (!inv) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }
  const items = await db.select().from(invoiceItemsTable).where(eq(invoiceItemsTable.invoiceId, id));
  const pays = await db.select().from(paymentsTable).where(eq(paymentsTable.invoiceId, id));
  const client = inv.clientId
    ? (await db.select().from(clientsTable).where(eq(clientsTable.id, inv.clientId)))[0]
    : null;
  res.json({
    ...(await fmt(inv)),
    items: items.map((i) => ({
      id: i.id,
      description: i.description,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      totalPrice: Number(i.totalPrice),
    })),
    payments: pays.map((p) => ({
      id: p.id,
      invoiceId: p.invoiceId,
      amount: Number(p.amount),
      method: p.method,
      reference: p.reference ?? null,
      paidAt: p.paidAt.toISOString(),
      notes: p.notes ?? null,
      recordedByName: null,
      createdAt: p.createdAt.toISOString(),
    })),
    client: client ?? null,
  });
});

invoicesRouter.patch("/invoices/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  const b = req.body ?? {};
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const f of ["clientId", "salesOrderId", "notes", "terms"] as const) {
    if (b[f] !== undefined) updates[f] = b[f];
  }
  if (b.dueDate !== undefined) updates.dueDate = b.dueDate ? new Date(b.dueDate) : null;
  if (b.taxRate !== undefined && b.taxRate !== null) updates.taxRate = String(b.taxRate);
  const [inv] = await db
    .update(invoicesTable)
    .set(updates)
    .where(and(eq(invoicesTable.id, id), eq(invoicesTable.organizationId, orgId)))
    .returning();
  if (!inv) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }
  if (Array.isArray(b.items)) {
    await db.delete(invoiceItemsTable).where(eq(invoiceItemsTable.invoiceId, id));
    if (b.items.length > 0) {
      await db.insert(invoiceItemsTable).values(
        b.items.map((it: { description: string; quantity: number; unitPrice: number }) => ({
          invoiceId: id,
          description: it.description,
          quantity: it.quantity,
          unitPrice: String(it.unitPrice),
          totalPrice: (it.quantity * it.unitPrice).toFixed(2),
        })),
      );
    }
  }
  await recalc(id);
  const [updated] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id));
  res.json(await fmt(updated));
});

invoicesRouter.patch("/invoices/:id/status", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  const { status } = req.body ?? {};
  if (!["draft", "sent", "partial", "paid", "overdue", "cancelled"].includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }
  const [inv] = await db
    .update(invoicesTable)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(invoicesTable.id, id), eq(invoicesTable.organizationId, orgId)))
    .returning();
  if (!inv) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }
  await logAction(req, "STATUS_CHANGE", "invoice", id, `Status changed to ${status}`);
  res.json(await fmt(inv));
});

invoicesRouter.post("/invoices/from-sales-order/:salesOrderId", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const soId = Number(req.params.salesOrderId);
  const [so] = await db
    .select()
    .from(salesOrdersTable)
    .where(and(eq(salesOrdersTable.id, soId), eq(salesOrdersTable.organizationId, orgId)));
  if (!so) {
    res.status(404).json({ error: "Sales order not found" });
    return;
  }
  const items = await db.select().from(salesOrderItemsTable).where(eq(salesOrderItemsTable.salesOrderId, soId));
  const [org] = await db.select().from(organizationsTable).where(eq(organizationsTable.id, orgId));
  let buyerState: string | null = null;
  if (so.clientId) {
    const [c] = await db.select().from(clientsTable).where(eq(clientsTable.id, so.clientId));
    buyerState = c?.state ?? null;
  }
  const [inv] = await db
    .insert(invoicesTable)
    .values({
      organizationId: orgId,
      invoiceNumber: genNumber(),
      clientId: so.clientId,
      salesOrderId: soId,
      status: "sent",
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 86400000),
      sellerState: org?.state ?? null,
      buyerState,
      taxRate: "18",
      createdById: req.user!.userId,
    })
    .returning();
  if (items.length > 0) {
    await db.insert(invoiceItemsTable).values(
      items.map((i) => ({
        invoiceId: inv.id,
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
      })),
    );
  }
  await recalc(inv.id);
  const [updated] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, inv.id));
  await logAction(req, "PROMOTE", "invoice", inv.id, `From SO ${so.orderNumber}`);
  res.status(201).json(await fmt(updated));
});

export { recalc as recalcInvoice };
export default invoicesRouter;
