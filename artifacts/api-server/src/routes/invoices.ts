import { Router } from "express";
import { getDb } from "../lib/firebase";
import { requireAuth } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";
import { calcGst, round2 } from "../lib/gst";
import { reverseAndRepost } from "../lib/accounting";

const db = () => getDb();

const invoicesRouter = Router();

function genNumber() {
  const d = new Date();
  return `INV-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}-${Math.floor(Math.random() * 9000) + 1000}`;
}

async function fmt(inv: Record<string, any>) {
  let clientName: string | null = null;
  if (inv.clientId) {
    const clientDoc = await db().collection("clients").doc(inv.clientId).get();
    if (clientDoc.exists) clientName = (clientDoc.data() as any).name ?? null;
  }
  return {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    clientId: inv.clientId ?? null,
    clientName,
    salesOrderId: inv.salesOrderId ?? null,
    status: inv.status,
    issueDate: inv.issueDate,
    dueDate: inv.dueDate ?? null,
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
    createdAt: inv.createdAt,
    updatedAt: inv.updatedAt,
  };
}

async function recalc(invoiceId: string) {
  const invDoc = await db().collection("invoices").doc(invoiceId).get();
  if (!invDoc.exists) return;
  const inv = { id: invDoc.id, ...invDoc.data() } as Record<string, any>;

  const itemsSnap = await db().collection("invoice_items").where("invoiceId", "==", invoiceId).get();
  const items = itemsSnap.docs.map((d) => d.data());
  const subtotal = items.reduce((acc: number, i: any) => acc + Number(i.totalPrice), 0);
  const discountAmount = Number(inv.discountAmount);
  const taxable = Math.max(0, subtotal - discountAmount);
  const taxRate = Number(inv.taxRate);
  const gst = calcGst(taxable, taxRate, inv.sellerState, inv.buyerState);
  const total = round2(taxable + gst.total);

  const paysSnap = await db().collection("payments").where("invoiceId", "==", invoiceId).get();
  const pays = paysSnap.docs.map((d) => d.data());
  const paid = pays.reduce((acc: number, p: any) => acc + Number(p.amount), 0);
  let status: string = inv.status;
  if (paid >= total && total > 0) status = "paid";
  else if (paid > 0) status = "partial";
  else if (inv.dueDate && new Date(inv.dueDate) < new Date()) status = "overdue";
  else if (status === "paid" || status === "partial") status = "sent";

  await db().collection("invoices").doc(invoiceId).update({
    subtotal: subtotal.toFixed(2),
    taxableAmount: taxable.toFixed(2),
    cgst: gst.cgst.toFixed(2),
    sgst: gst.sgst.toFixed(2),
    igst: gst.igst.toFixed(2),
    total: total.toFixed(2),
    amountPaid: paid.toFixed(2),
    status,
    updatedAt: new Date().toISOString(),
  });

  const isPostable = status !== "draft" && status !== "cancelled";
  await reverseAndRepost(
    inv.organizationId as any,
    "invoice",
    invoiceId as any,
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
    { entryDate: new Date(inv.issueDate), memo: `Invoice ${inv.invoiceNumber}` },
  );
}

invoicesRouter.get("/invoices", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  let snap = await db().collection("invoices").where("organizationId", "==", orgId).orderBy("createdAt", "desc").get();
  let rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const statusQ = req.query.status as string | undefined;
  if (statusQ) rows = rows.filter((r) => r.status === statusQ);
  res.json(await Promise.all(rows.map(fmt)));
});

invoicesRouter.post("/invoices", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const b = req.body ?? {};

  const orgDoc = await db().collection("organizations").doc(orgId).get();
  const org = orgDoc.exists ? orgDoc.data() : null;

  let buyerState: string | null = null;
  if (b.clientId) {
    const clientDoc = await db().collection("clients").doc(b.clientId).get();
    if (clientDoc.exists) buyerState = (clientDoc.data() as any).state ?? null;
  }

  const now = new Date().toISOString();
  const invData = {
    organizationId: orgId,
    invoiceNumber: genNumber(),
    clientId: b.clientId ?? null,
    salesOrderId: b.salesOrderId ?? null,
    status: "draft",
    issueDate: now,
    dueDate: b.dueDate ? new Date(b.dueDate).toISOString() : null,
    sellerState: org?.state ?? null,
    buyerState,
    subtotal: "0",
    discountAmount: "0",
    taxableAmount: "0",
    cgst: "0",
    sgst: "0",
    igst: "0",
    taxRate: b.taxRate !== undefined && b.taxRate !== null ? String(b.taxRate) : "18",
    total: "0",
    amountPaid: "0",
    notes: b.notes ?? null,
    terms: b.terms ?? "Payment due within 30 days. GST as applicable.",
    createdById: req.user!.userId,
    createdAt: now,
    updatedAt: now,
  };
  const invRef = await db().collection("invoices").add(invData);
  const inv = { id: invRef.id, ...invData };

  if (Array.isArray(b.items) && b.items.length > 0) {
    for (const it of b.items) {
      const itemData = {
        invoiceId: inv.id,
        description: it.description,
        quantity: it.quantity,
        unitPrice: String(it.unitPrice),
        totalPrice: (it.quantity * it.unitPrice).toFixed(2),
      };
      await db().collection("invoice_items").add(itemData);
    }
  }

  await recalc(inv.id);
  const updatedDoc = await db().collection("invoices").doc(inv.id).get();
  const updated = { id: updatedDoc.id, ...updatedDoc.data() } as Record<string, any>;
  await logAction(req, "CREATE", "invoice", inv.id as any);
  res.status(201).json(await fmt(updated));
});

invoicesRouter.get("/invoices/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = req.params.id;
  const invDoc = await db().collection("invoices").doc(id).get();
  if (!invDoc.exists || (invDoc.data() as any).organizationId !== orgId) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }
  const inv = { id: invDoc.id, ...invDoc.data() } as Record<string, any>;

  const itemsSnap = await db().collection("invoice_items").where("invoiceId", "==", id).get();
  const items = itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const paysSnap = await db().collection("payments").where("invoiceId", "==", id).get();
  const pays = paysSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  let client: Record<string, any> | null = null;
  if (inv.clientId) {
    const clientDoc = await db().collection("clients").doc(inv.clientId).get();
    if (clientDoc.exists) client = { id: clientDoc.id, ...clientDoc.data() } as Record<string, any>;
  }

  res.json({
    ...(await fmt(inv)),
    items: items.map((i: any) => ({
      id: i.id,
      description: i.description,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      totalPrice: Number(i.totalPrice),
    })),
    payments: pays.map((p: any) => ({
      id: p.id,
      invoiceId: p.invoiceId,
      amount: Number(p.amount),
      method: p.method,
      reference: p.reference ?? null,
      paidAt: p.paidAt,
      notes: p.notes ?? null,
      recordedByName: null,
      createdAt: p.createdAt,
    })),
    client: client ?? null,
  });
});

invoicesRouter.patch("/invoices/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = req.params.id;
  const b = req.body ?? {};

  const invDoc = await db().collection("invoices").doc(id).get();
  if (!invDoc.exists || (invDoc.data() as any).organizationId !== orgId) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  for (const f of ["clientId", "salesOrderId", "notes", "terms"] as const) {
    if (b[f] !== undefined) updates[f] = b[f];
  }
  if (b.dueDate !== undefined) updates.dueDate = b.dueDate ? new Date(b.dueDate).toISOString() : null;
  if (b.taxRate !== undefined && b.taxRate !== null) updates.taxRate = String(b.taxRate);

  await db().collection("invoices").doc(id).update(updates);

  if (Array.isArray(b.items)) {
    const existingSnap = await db().collection("invoice_items").where("invoiceId", "==", id).get();
    for (const doc of existingSnap.docs) {
      await doc.ref.delete();
    }
    if (b.items.length > 0) {
      for (const it of b.items) {
        const itemData = {
          invoiceId: id,
          description: it.description,
          quantity: it.quantity,
          unitPrice: String(it.unitPrice),
          totalPrice: (it.quantity * it.unitPrice).toFixed(2),
        };
        await db().collection("invoice_items").add(itemData);
      }
    }
  }

  await recalc(id);
  const updatedDoc = await db().collection("invoices").doc(id).get();
  const updated = { id: updatedDoc.id, ...updatedDoc.data() } as Record<string, any>;
  res.json(await fmt(updated));
});

invoicesRouter.patch("/invoices/:id/status", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = req.params.id;
  const { status } = req.body ?? {};
  if (!["draft", "sent", "partial", "paid", "overdue", "cancelled"].includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }

  const invDoc = await db().collection("invoices").doc(id).get();
  if (!invDoc.exists || (invDoc.data() as any).organizationId !== orgId) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  await db().collection("invoices").doc(id).update({
    status,
    updatedAt: new Date().toISOString(),
  });

  await logAction(req, "STATUS_CHANGE", "invoice", id as any, `Status changed to ${status}`);
  const updatedDoc = await db().collection("invoices").doc(id).get();
  const inv = { id: updatedDoc.id, ...updatedDoc.data() } as Record<string, any>;
  res.json(await fmt(inv));
});

invoicesRouter.post("/invoices/from-sales-order/:salesOrderId", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const soId = req.params.salesOrderId;

  const soDoc = await db().collection("sales_orders").doc(soId).get();
  if (!soDoc.exists || (soDoc.data() as any).organizationId !== orgId) {
    res.status(404).json({ error: "Sales order not found" });
    return;
  }
  const so = { id: soDoc.id, ...soDoc.data() } as Record<string, any>;

  const itemsSnap = await db().collection("sales_order_items").where("salesOrderId", "==", soId).get();
  const items = itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const orgDoc = await db().collection("organizations").doc(orgId).get();
  const org = orgDoc.exists ? orgDoc.data() : null;

  let buyerState: string | null = null;
  if (so.clientId) {
    const clientDoc = await db().collection("clients").doc(so.clientId).get();
    if (clientDoc.exists) buyerState = (clientDoc.data() as any).state ?? null;
  }

  const now = new Date().toISOString();
  const invData = {
    organizationId: orgId,
    invoiceNumber: genNumber(),
    clientId: so.clientId,
    salesOrderId: soId,
    status: "sent",
    issueDate: now,
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
    sellerState: org?.state ?? null,
    buyerState,
    subtotal: "0",
    discountAmount: "0",
    taxableAmount: "0",
    cgst: "0",
    sgst: "0",
    igst: "0",
    taxRate: "18",
    total: "0",
    amountPaid: "0",
    createdById: req.user!.userId,
    createdAt: now,
    updatedAt: now,
  };
  const invRef = await db().collection("invoices").add(invData);
  const inv = { id: invRef.id, ...invData };

  if (items.length > 0) {
    for (const i of items) {
      const itemData = {
        invoiceId: inv.id,
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
      };
      await db().collection("invoice_items").add(itemData);
    }
  }

  await recalc(inv.id);
  const updatedDoc = await db().collection("invoices").doc(inv.id).get();
  const updated = { id: updatedDoc.id, ...updatedDoc.data() } as Record<string, any>;
  await logAction(req, "PROMOTE", "invoice", inv.id as any, `From SO ${so.orderNumber}`);
  res.status(201).json(await fmt(updated));
});

export { recalc as recalcInvoice };
export default invoicesRouter;
