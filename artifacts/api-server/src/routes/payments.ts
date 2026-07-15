import { Router } from "express";
import { getDb } from "../lib/firebase";
import { requireAuth } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";
import { recalcInvoice } from "./invoices";
import { reverseAndRepost } from "../lib/accounting";

const db = () => getDb();

async function repostPayment(p: Record<string, any>) {
  await reverseAndRepost(
    p.organizationId as any,
    "payment",
    p.id as any,
    async () => [
      { accountCode: p.method === "cash" ? "1000" : "1010", debit: Number(p.amount), description: `Payment ${p.reference ?? ""}`.trim() },
      { accountCode: "1100", credit: Number(p.amount), description: "AR reduction" },
    ],
    { entryDate: new Date(p.paidAt), memo: `Payment for invoice` },
  );
}

const paymentsRouter = Router();

function fmt(p: Record<string, any>) {
  return {
    id: p.id,
    invoiceId: p.invoiceId,
    amount: Number(p.amount),
    method: p.method,
    reference: p.reference ?? null,
    paidAt: p.paidAt,
    notes: p.notes ?? null,
    recordedByName: null,
    createdAt: p.createdAt,
  };
}

paymentsRouter.get("/payments", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const invoiceId = req.query.invoiceId ? String(req.query.invoiceId) : null;
  let snap = await db().collection("payments").where("organizationId", "==", orgId).orderBy("paidAt", "desc").get();
  let rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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
  const invDoc = await db().collection("invoices").doc(String(invoiceId)).get();
  if (!invDoc.exists || (invDoc.data() as any).organizationId !== orgId) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }
  const inv = { id: invDoc.id, ...invDoc.data() } as Record<string, any>;
  const now = new Date().toISOString();
  const paymentData = {
    organizationId: orgId,
    invoiceId: String(invoiceId),
    amount: String(amount),
    method: method ?? "bank_transfer",
    reference: reference ?? null,
    paidAt: paidAt ? new Date(paidAt).toISOString() : now,
    notes: notes ?? null,
    recordedById: req.user!.userId,
    createdAt: now,
  };
  const ref = await db().collection("payments").add(paymentData);
  const p = { id: ref.id, ...paymentData };
  await recalcInvoice(String(invoiceId));
  await repostPayment(p);
  await logAction(req, "RECORD_PAYMENT", "payment", ref.id as any, `₹${amount} for invoice ${inv.invoiceNumber}`);
  res.status(201).json(fmt(p));
});

paymentsRouter.delete("/payments/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = req.params.id;
  const pDoc = await db().collection("payments").doc(id).get();
  if (!pDoc.exists || (pDoc.data() as any).organizationId !== orgId) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }
  const p = { id: pDoc.id, ...pDoc.data() } as Record<string, any>;
  await db().collection("payments").doc(id).delete();
  await recalcInvoice(p.invoiceId);
  await reverseAndRepost(p.organizationId as any, "payment", id as any, async () => null, { entryDate: new Date() });
  res.json({ message: "Payment deleted" });
});

export default paymentsRouter;
