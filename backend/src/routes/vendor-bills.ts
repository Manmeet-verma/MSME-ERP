import { Router } from "express";
import { getDb } from "../lib/firebase";
import { requireAuth } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";
import { reverseAndRepost } from "../lib/accounting";

const db = () => getDb();

const vendorBillsRouter = Router();

function genNumber() {
  const d = new Date();
  return `BILL-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}-${Math.floor(Math.random() * 9000) + 1000}`;
}

type BillStatus = "draft" | "open" | "partial" | "paid" | "overdue" | "cancelled";

function deriveStatus(total: number, paid: number, dueDate: string | null, current: string): BillStatus {
  if (current === "draft" || current === "cancelled") return current;
  if (paid >= total && total > 0) return "paid";
  if (dueDate && new Date(dueDate) < new Date() && paid < total) return "overdue";
  if (paid > 0 && paid < total) return "partial";
  return "open";
}

async function fmt(b: any) {
  let vendorName: string | null = null;
  if (b.vendorId) {
    const vDoc = await db().collection("vendors").doc(b.vendorId).get();
    if (vDoc.exists) vendorName = vDoc.data()!.name as string;
  }
  return {
    id: b.id,
    billNumber: b.billNumber,
    vendorId: b.vendorId ?? null,
    vendorName,
    purchaseOrderId: b.purchaseOrderId ?? null,
    status: b.status,
    issueDate: b.issueDate,
    dueDate: b.dueDate ?? null,
    subtotal: Number(b.subtotal),
    taxAmount: Number(b.taxAmount),
    total: Number(b.total),
    amountPaid: Number(b.amountPaid),
    notes: b.notes ?? null,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

async function recalc(billId: string, taxRate = 18) {
  const itemsSnap = await db()
    .collection("vendor_bill_items")
    .where("vendorBillId", "==", billId)
    .get();
  const items = itemsSnap.docs.map((d) => d.data());
  const subtotal = items.reduce((s, i) => s + Number(i.totalPrice), 0);
  const tax = (subtotal * taxRate) / 100;
  const total = subtotal + tax;

  const bDoc = await db().collection("vendor_bills").doc(billId).get();
  const bData = bDoc.data()!;
  const status = deriveStatus(total, Number(bData.amountPaid), bData.dueDate, bData.status);

  await db().collection("vendor_bills").doc(billId).update({
    subtotal: subtotal.toFixed(2),
    taxAmount: tax.toFixed(2),
    total: total.toFixed(2),
    status,
    updatedAt: new Date().toISOString(),
  });

  const uDoc = await db().collection("vendor_bills").doc(billId).get();
  const u = uDoc.data()!;
  const postable = u.status !== "draft" && u.status !== "cancelled" && Number(u.total) > 0;

  await reverseAndRepost(
    u.organizationId,
    "vendor_bill",
    billId,
    async () => {
      if (!postable) return null;
      const sub = Number(u.subtotal);
      const t = Number(u.taxAmount);
      const tot = Number(u.total);
      const lines: Array<{ accountCode: string; debit?: number; credit?: number; description: string }> = [
        { accountCode: "1200", debit: sub, description: `Vendor bill ${u.billNumber}` },
      ];
      if (t > 0) lines.push({ accountCode: "1300", debit: t, description: "GST input on bill" });
      lines.push({ accountCode: "2000", credit: tot, description: "Accounts payable" });
      return lines;
    },
    { entryDate: new Date(u.issueDate), memo: `Vendor bill ${u.billNumber}` },
  );

  const paid = Number(u.amountPaid ?? 0);
  await reverseAndRepost(
    u.organizationId,
    "vendor_bill_payment",
    billId,
    async () => {
      if (!postable || paid <= 0) return null;
      return [
        { accountCode: "2000", debit: paid, description: `Payment for bill ${u.billNumber}` },
        { accountCode: "1010", credit: paid, description: `Payment for bill ${u.billNumber}` },
      ];
    },
    { entryDate: new Date(), memo: `Payment of vendor bill ${u.billNumber}` },
  );
}

vendorBillsRouter.get("/vendor-bills", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const snapshot = await db()
    .collection("vendor_bills")
    .where("organizationId", "==", orgId)
    .get();
  const rows = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  rows.sort((a, b) => ((b.createdAt as string) ?? "").localeCompare((a.createdAt as string) ?? ""));
  res.json(await Promise.all(rows.map(fmt)));
});

vendorBillsRouter.get("/vendor-bills/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = req.params.id;
  const doc = await db().collection("vendor_bills").doc(id).get();
  if (!doc.exists || doc.data()!.organizationId !== orgId) {
    res.status(404).json({ error: "Vendor bill not found" });
    return;
  }
  const b = { id: doc.id, ...doc.data()! };
  const itemsSnap = await db()
    .collection("vendor_bill_items")
    .where("vendorBillId", "==", id)
    .get();
  const items = itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
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
  let items: Array<{ itemId?: string; description: string; quantity: number; unitPrice: number }> =
    Array.isArray(b.items) ? b.items : [];

  if (b.vendorId) {
    const vDoc = await db().collection("vendors").doc(b.vendorId).get();
    if (!vDoc.exists || vDoc.data()!.organizationId !== orgId) {
      res.status(400).json({ error: "Invalid vendor" });
      return;
    }
  }

  if (b.purchaseOrderId) {
    const poDoc = await db().collection("purchase_orders").doc(b.purchaseOrderId).get();
    if (!poDoc.exists || poDoc.data()!.organizationId !== orgId) {
      res.status(400).json({ error: "Invalid purchase order" });
      return;
    }
  }

  if (b.purchaseOrderId && items.length === 0) {
    const poItemsSnap = await db()
      .collection("purchase_order_items")
      .where("purchaseOrderId", "==", b.purchaseOrderId)
      .get();
    items = poItemsSnap.docs.map((d) => {
      const p = d.data();
      return {
        itemId: p.itemId ?? undefined,
        description: p.description,
        quantity: Number(p.quantity),
        unitPrice: Number(p.unitPrice),
      };
    });
  }

  const now = new Date().toISOString();
  const docRef = await db().collection("vendor_bills").add({
    organizationId: orgId,
    billNumber: b.billNumber ?? genNumber(),
    vendorId: b.vendorId ?? null,
    purchaseOrderId: b.purchaseOrderId ?? null,
    status: b.status ?? "open",
    issueDate: b.issueDate ?? now,
    dueDate: b.dueDate ?? null,
    amountPaid: b.amountPaid != null ? String(b.amountPaid) : "0",
    notes: b.notes ?? null,
    createdById: req.user!.userId,
    subtotal: "0",
    taxAmount: "0",
    total: "0",
    createdAt: now,
    updatedAt: now,
  });

  if (items.length > 0) {
    const batch = db().batch();
    for (const it of items) {
      const itemRef = db().collection("vendor_bill_items").doc();
      batch.set(itemRef, {
        vendorBillId: docRef.id,
        itemId: it.itemId ?? null,
        description: it.description,
        quantity: String(it.quantity),
        unitPrice: String(it.unitPrice),
        totalPrice: (it.quantity * it.unitPrice).toFixed(2),
      });
    }
    await batch.commit();
    await recalc(docRef.id, Number(b.taxRate ?? 18));
  }

  const uDoc = await db().collection("vendor_bills").doc(docRef.id).get();
  await logAction(req, "CREATE", "vendor_bill", docRef.id);
  res.status(201).json(await fmt({ id: docRef.id, ...uDoc.data()! }));
});

vendorBillsRouter.patch("/vendor-bills/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = req.params.id;
  const b = req.body ?? {};

  if (b.vendorId !== undefined && b.vendorId !== null) {
    const vDoc = await db().collection("vendors").doc(b.vendorId).get();
    if (!vDoc.exists || vDoc.data()!.organizationId !== orgId) {
      res.status(400).json({ error: "Invalid vendor" });
      return;
    }
  }
  if (b.purchaseOrderId !== undefined && b.purchaseOrderId !== null) {
    const poDoc = await db().collection("purchase_orders").doc(b.purchaseOrderId).get();
    if (!poDoc.exists || poDoc.data()!.organizationId !== orgId) {
      res.status(400).json({ error: "Invalid purchase order" });
      return;
    }
  }

  const docRef = db().collection("vendor_bills").doc(id);
  const doc = await docRef.get();
  if (!doc.exists || doc.data()!.organizationId !== orgId) {
    res.status(404).json({ error: "Vendor bill not found" });
    return;
  }

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  for (const f of ["billNumber", "vendorId", "purchaseOrderId", "status", "notes"] as const) {
    if (b[f] !== undefined) updates[f] = b[f];
  }
  if (b.dueDate !== undefined) updates.dueDate = b.dueDate ? b.dueDate : null;
  if (b.issueDate !== undefined) updates.issueDate = b.issueDate ? b.issueDate : new Date().toISOString();
  if (b.amountPaid !== undefined && b.amountPaid !== null) updates.amountPaid = String(b.amountPaid);
  await docRef.update(updates);

  if (Array.isArray(b.items)) {
    const existingSnap = await db()
      .collection("vendor_bill_items")
      .where("vendorBillId", "==", id)
      .get();
    const batch = db().batch();
    for (const d of existingSnap.docs) {
      batch.delete(d.ref);
    }
    if (b.items.length > 0) {
      for (const it of b.items as Array<{ itemId?: string; description: string; quantity: number; unitPrice: number }>) {
        const itemRef = db().collection("vendor_bill_items").doc();
        batch.set(itemRef, {
          vendorBillId: id,
          itemId: it.itemId ?? null,
          description: it.description,
          quantity: String(it.quantity),
          unitPrice: String(it.unitPrice),
          totalPrice: (it.quantity * it.unitPrice).toFixed(2),
        });
      }
    }
    await batch.commit();
  }

  await recalc(id, Number(b.taxRate ?? 18));
  const uDoc = await db().collection("vendor_bills").doc(id).get();
  await logAction(req, "UPDATE", "vendor_bill", id);
  res.json(await fmt({ id: uDoc.id, ...uDoc.data()! }));
});

export default vendorBillsRouter;
