import { Router } from "express";
import { getDb } from "../lib/firebase";
import { requireAuth } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";

const db = () => getDb();

const purchaseOrdersRouter = Router();

async function validateOwnership(
  orgId: string,
  b: { vendorId?: string; warehouseId?: string; items?: Array<{ itemId?: string }> },
): Promise<string | null> {
  if (b.vendorId) {
    const vDoc = await db().collection("vendors").doc(b.vendorId).get();
    if (!vDoc.exists || vDoc.data()!.organizationId !== orgId) return "Invalid vendor";
  }
  if (b.warehouseId) {
    const wDoc = await db().collection("warehouses").doc(b.warehouseId).get();
    if (!wDoc.exists || wDoc.data()!.organizationId !== orgId) return "Invalid warehouse";
  }
  if (Array.isArray(b.items)) {
    const ids = Array.from(new Set(b.items.map((i) => i.itemId).filter((x): x is string => x != null)));
    if (ids.length > 0) {
      const itemsSnap = await db()
        .collection("items")
        .where("organizationId", "==", orgId)
        .where("__name__", "in", ids)
        .get();
      if (itemsSnap.size !== ids.length) return "One or more items not found in this organization";
    }
  }
  return null;
}

function genNumber() {
  const d = new Date();
  return `PO-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}-${Math.floor(Math.random() * 9000) + 1000}`;
}

async function fmt(p: any) {
  let vendorName: string | null = null;
  if (p.vendorId) {
    const vDoc = await db().collection("vendors").doc(p.vendorId).get();
    if (vDoc.exists) vendorName = vDoc.data()!.name as string;
  }
  return {
    id: p.id,
    poNumber: p.poNumber,
    vendorId: p.vendorId ?? null,
    vendorName,
    warehouseId: p.warehouseId ?? null,
    status: p.status,
    expectedDate: p.expectedDate ?? null,
    subtotal: Number(p.subtotal),
    taxAmount: Number(p.taxAmount),
    total: Number(p.total),
    notes: p.notes ?? null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

async function recalc(poId: string, taxRate = 18) {
  const itemsSnap = await db()
    .collection("purchase_order_items")
    .where("purchaseOrderId", "==", poId)
    .get();
  const items = itemsSnap.docs.map((d) => d.data());
  const subtotal = items.reduce((s, i) => s + Number(i.totalPrice), 0);
  const tax = (subtotal * taxRate) / 100;
  await db().collection("purchase_orders").doc(poId).update({
    subtotal: subtotal.toFixed(2),
    taxAmount: tax.toFixed(2),
    total: (subtotal + tax).toFixed(2),
    updatedAt: new Date().toISOString(),
  });
}

purchaseOrdersRouter.get("/purchase-orders", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const snapshot = await db()
    .collection("purchase_orders")
    .where("organizationId", "==", orgId)
    .get();
  const rows = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  rows.sort((a, b) => ((b.createdAt as string) ?? "").localeCompare((a.createdAt as string) ?? ""));
  res.json(await Promise.all(rows.map(fmt)));
});

purchaseOrdersRouter.get("/purchase-orders/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = req.params.id;
  const doc = await db().collection("purchase_orders").doc(id).get();
  if (!doc.exists || doc.data()!.organizationId !== orgId) {
    res.status(404).json({ error: "Purchase order not found" });
    return;
  }
  const p = { id: doc.id, ...doc.data()! };

  const itemsSnap = await db()
    .collection("purchase_order_items")
    .where("purchaseOrderId", "==", id)
    .get();
  const items = itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const itemIds = items.map((i) => i.itemId).filter((x): x is string => x != null);

  const itemsMap = new Map<string, any>();
  if (itemIds.length > 0) {
    const itemsSnap2 = await db()
      .collection("items")
      .where("__name__", "in", itemIds)
      .get();
    for (const d of itemsSnap2.docs) {
      itemsMap.set(d.id, { id: d.id, ...d.data() });
    }
  }

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
  const ownershipErr = await validateOwnership(orgId, b);
  if (ownershipErr) {
    res.status(400).json({ error: ownershipErr });
    return;
  }
  const now = new Date().toISOString();
  const docRef = await db().collection("purchase_orders").add({
    organizationId: orgId,
    poNumber: genNumber(),
    vendorId: b.vendorId ?? null,
    warehouseId: b.warehouseId ?? null,
    status: b.status ?? "draft",
    expectedDate: b.expectedDate ?? null,
    notes: b.notes ?? null,
    createdById: req.user!.userId,
    subtotal: "0",
    taxAmount: "0",
    total: "0",
    createdAt: now,
    updatedAt: now,
  });

  if (Array.isArray(b.items) && b.items.length > 0) {
    const batch = db().batch();
    for (const it of b.items as Array<{ itemId?: string; description: string; quantity: number; unitPrice: number }>) {
      const itemRef = db().collection("purchase_order_items").doc();
      batch.set(itemRef, {
        purchaseOrderId: docRef.id,
        itemId: it.itemId ?? null,
        description: it.description,
        quantity: String(it.quantity),
        receivedQuantity: "0",
        unitPrice: String(it.unitPrice),
        totalPrice: (it.quantity * it.unitPrice).toFixed(2),
      });
    }
    await batch.commit();
    await recalc(docRef.id, Number(b.taxRate ?? 18));
  }

  const uDoc = await db().collection("purchase_orders").doc(docRef.id).get();
  await logAction(req, "CREATE", "purchase_order", docRef.id);
  res.status(201).json(await fmt({ id: docRef.id, ...uDoc.data()! }));
});

purchaseOrdersRouter.patch("/purchase-orders/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = req.params.id;
  const b = req.body ?? {};
  const ownershipErr = await validateOwnership(orgId, b);
  if (ownershipErr) {
    res.status(400).json({ error: ownershipErr });
    return;
  }
  const docRef = db().collection("purchase_orders").doc(id);
  const doc = await docRef.get();
  if (!doc.exists || doc.data()!.organizationId !== orgId) {
    res.status(404).json({ error: "Purchase order not found" });
    return;
  }
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  for (const f of ["vendorId", "warehouseId", "status", "notes"] as const) {
    if (b[f] !== undefined) updates[f] = b[f];
  }
  if (b.expectedDate !== undefined) updates.expectedDate = b.expectedDate ? b.expectedDate : null;
  await docRef.update(updates);

  if (Array.isArray(b.items)) {
    const existingSnap = await db()
      .collection("purchase_order_items")
      .where("purchaseOrderId", "==", id)
      .get();
    const existing = existingSnap.docs.map((d) => d.data());
    const anyReceived = existing.some((p) => Number(p.receivedQuantity) > 0);
    if (anyReceived) {
      res.status(409).json({ error: "Cannot edit items on a purchase order that has received quantities" });
      return;
    }
    const batch = db().batch();
    for (const d of existingSnap.docs) {
      batch.delete(d.ref);
    }
    if (b.items.length > 0) {
      for (const it of b.items as Array<{ itemId?: string; description: string; quantity: number; unitPrice: number }>) {
        const itemRef = db().collection("purchase_order_items").doc();
        batch.set(itemRef, {
          purchaseOrderId: id,
          itemId: it.itemId ?? null,
          description: it.description,
          quantity: String(it.quantity),
          receivedQuantity: "0",
          unitPrice: String(it.unitPrice),
          totalPrice: (it.quantity * it.unitPrice).toFixed(2),
        });
      }
    }
    await batch.commit();
    await recalc(id, Number(b.taxRate ?? 18));
  }

  const uDoc = await db().collection("purchase_orders").doc(id).get();
  await logAction(req, "UPDATE", "purchase_order", id);
  res.json(await fmt({ id: uDoc.id, ...uDoc.data()! }));
});

export default purchaseOrdersRouter;
