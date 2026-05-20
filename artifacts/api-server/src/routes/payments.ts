import { Router } from "express";
import { db, paymentsTable, invoicesTable } from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";
import { recalcInvoice } from "./invoices";

const paymentsRouter = Router();

function fmt(p: typeof paymentsTable.$inferSelect) {
  return {
    id: p.id,
    invoiceId: p.invoiceId,
    amount: Number(p.amount),
    method: p.method,
    reference: p.reference ?? null,
    paidAt: p.paidAt.toISOString(),
    notes: p.notes ?? null,
    recordedByName: null,
    createdAt: p.createdAt.toISOString(),
  };
}

paymentsRouter.get("/payments", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const invoiceId = req.query.invoiceId ? Number(req.query.invoiceId) : null;
  let rows = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.organizationId, orgId))
    .orderBy(desc(paymentsTable.paidAt));
  if (invoiceId) rows = rows.filter((r) => r.invoiceId === invoiceId);
  res.json(rows.map(fmt));
});

paymentsRouter.post("/payments", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const { invoiceId, amount, method, reference, paidAt, notes } = req.body ?? {};
  if (!invoiceId || amount === undefined) {
    res.status(400).json({ error: "invoiceId and amount required" });
    return;
  }
  const [inv] = await db
    .select()
    .from(invoicesTable)
    .where(and(eq(invoicesTable.id, Number(invoiceId)), eq(invoicesTable.organizationId, orgId)));
  if (!inv) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }
  const [p] = await db
    .insert(paymentsTable)
    .values({
      organizationId: orgId,
      invoiceId: Number(invoiceId),
      amount: String(amount),
      method: method ?? "bank_transfer",
      reference: reference ?? null,
      paidAt: paidAt ? new Date(paidAt) : new Date(),
      notes: notes ?? null,
      recordedById: req.user!.userId,
    })
    .returning();
  await recalcInvoice(Number(invoiceId));
  await logAction(req, "RECORD_PAYMENT", "payment", p.id, `₹${amount} for invoice ${inv.invoiceNumber}`);
  res.status(201).json(fmt(p));
});

paymentsRouter.delete("/payments/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  const [p] = await db
    .select()
    .from(paymentsTable)
    .where(and(eq(paymentsTable.id, id), eq(paymentsTable.organizationId, orgId)));
  if (!p) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }
  await db.delete(paymentsTable).where(eq(paymentsTable.id, id));
  await recalcInvoice(p.invoiceId);
  res.json({ message: "Payment deleted" });
});

export default paymentsRouter;
