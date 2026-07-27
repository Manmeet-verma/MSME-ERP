import { Router } from "express";
import { getDb } from "../lib/firebase";
import { requireAuth } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";
import { recordMovement } from "../lib/stockEngine";

const db = () => getDb();

const grnRouter = Router();

function genNumber() {
  const d = new Date();
  return `GRN-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}-${Math.floor(Math.random() * 9000) + 1000}`;
}

async function fmt(g: any) {
  const itemsSnap = await db()
    .collection("grn_items")
    .where("grnId", "==", g.id)
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

  let warehouseName: string | null = null;
  if (g.warehouseId) {
    const whDoc = await db().collection("warehouses").doc(g.warehouseId).get();
    if (whDoc.exists) warehouseName = whDoc.data()!.name as string;
  }

  let poNumber: string | null = null;
  if (g.purchaseOrderId) {
    const poDoc = await db().collection("purchase_orders").doc(g.purchaseOrderId).get();
    if (poDoc.exists) poNumber = poDoc.data()!.poNumber as string;
  }

  return {
    id: g.id,
    grnNumber: g.grnNumber,
    purchaseOrderId: g.purchaseOrderId ?? null,
    poNumber,
    warehouseId: g.warehouseId,
    warehouseName,
    receivedAt: g.receivedAt,
    notes: g.notes ?? null,
    items: items.map((i) => {
      const it = i.itemId ? itemsMap.get(i.itemId) : null;
      return {
        id: i.id,
        poItemId: i.poItemId ?? null,
        itemId: i.itemId,
        itemName: it?.name ?? null,
        itemSku: it?.sku ?? null,
        quantity: Number(i.quantity),
        unitCost: Number(i.unitCost),
      };
    }),
    createdAt: g.createdAt,
  };
}

grnRouter.get("/grn", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const poId = req.query.purchaseOrderId as string | undefined;

  let snapshot;
  if (poId) {
    snapshot = await db()
      .collection("grn")
      .where("organizationId", "==", orgId)
      .where("purchaseOrderId", "==", poId)
      .get();
  } else {
    snapshot = await db()
      .collection("grn")
      .where("organizationId", "==", orgId)
      .get();
  }

  const rows = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  rows.sort((a, b) => ((b.createdAt as string) ?? "").localeCompare((a.createdAt as string) ?? ""));
  res.json(await Promise.all(rows.map(fmt)));
});

grnRouter.post("/grn", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const b = req.body ?? {};
  if (!b.warehouseId || !Array.isArray(b.items) || b.items.length === 0) {
    res.status(400).json({ error: "warehouseId and items required" });
    return;
  }

  const whDoc = await db().collection("warehouses").doc(b.warehouseId).get();
  if (!whDoc.exists || whDoc.data()!.organizationId !== orgId) {
    res.status(400).json({ error: "Invalid warehouse" });
    return;
  }

  let poItemIds: string[] = [];
  if (b.purchaseOrderId) {
    const poDoc = await db().collection("purchase_orders").doc(b.purchaseOrderId).get();
    if (!poDoc.exists || poDoc.data()!.organizationId !== orgId) {
      res.status(400).json({ error: "Invalid purchase order" });
      return;
    }
    const poItemsSnap = await db()
      .collection("purchase_order_items")
      .where("purchaseOrderId", "==", b.purchaseOrderId)
      .get();
    poItemIds = poItemsSnap.docs.map((d) => d.id);
  }

  const incomingItems = b.items as Array<{
    poItemId?: string;
    itemId: string;
    quantity: number;
    unitCost: number;
  }>;
  const itemIdsToCheck = Array.from(new Set(incomingItems.map((i) => i.itemId)));
  if (itemIdsToCheck.length > 0) {
    const ownedItemsSnap = await db()
      .collection("items")
      .where("organizationId", "==", orgId)
      .where("__name__", "in", itemIdsToCheck)
      .get();
    if (ownedItemsSnap.size !== itemIdsToCheck.length) {
      res.status(400).json({ error: "One or more items not found in this organization" });
      return;
    }
  }

  const poLinePending = new Map<string, number>();
  const poLineItem = new Map<string, string | null>();
  if (b.purchaseOrderId && poItemIds.length > 0) {
    const poLinesSnap = await db()
      .collection("purchase_order_items")
      .where("purchaseOrderId", "==", b.purchaseOrderId)
      .get();
    for (const d of poLinesSnap.docs) {
      const data = d.data();
      poLinePending.set(d.id, Number(data.quantity) - Number(data.receivedQuantity));
      poLineItem.set(d.id, data.itemId ?? null);
    }
  }

  for (const it of incomingItems) {
    if (it.poItemId && !poItemIds.includes(it.poItemId)) {
      res.status(400).json({ error: "Invalid PO line reference" });
      return;
    }
    if (it.poItemId) {
      const expected = poLineItem.get(it.poItemId);
      if (expected != null && expected !== it.itemId) {
        res.status(409).json({
          error: "GRN line item does not match the referenced PO line item",
          poItemId: it.poItemId,
          expectedItemId: expected,
          receivedItemId: it.itemId,
        });
        return;
      }
    }
    if (!(it.quantity > 0)) {
      res.status(400).json({ error: "Quantity must be positive" });
      return;
    }
    if (it.poItemId) {
      const pending = poLinePending.get(it.poItemId) ?? 0;
      if (it.quantity > pending) {
        res.status(409).json({
          error: "Over-receipt is not allowed",
          poItemId: it.poItemId,
          pending,
          attempted: it.quantity,
        });
        return;
      }
      poLinePending.set(it.poItemId, pending - it.quantity);
    }
  }

  let g: any;
  try {
    g = await db().runTransaction(async (tx) => {
      const now = new Date().toISOString();
      const grnRef = db().collection("grn").doc();
      tx.set(grnRef, {
        organizationId: orgId,
        grnNumber: genNumber(),
        purchaseOrderId: b.purchaseOrderId ?? null,
        warehouseId: b.warehouseId,
        receivedAt: b.receivedAt ?? now,
        notes: b.notes ?? null,
        createdById: req.user!.userId,
        createdAt: now,
      });

      for (const it of incomingItems) {
        const grnItemRef = db().collection("grn_items").doc();
        tx.set(grnItemRef, {
          grnId: grnRef.id,
          poItemId: it.poItemId ?? null,
          itemId: it.itemId,
          quantity: String(it.quantity),
          unitCost: String(it.unitCost),
        });

        await recordMovement({
          organizationId: orgId,
          itemId: it.itemId,
          warehouseId: b.warehouseId,
          direction: "in",
          quantity: it.quantity,
          unitCost: it.unitCost,
          reason: "purchase",
          referenceType: "grn",
          referenceId: grnRef.id,
          createdById: req.user!.userId,
          executor: tx,
        });

        if (it.poItemId) {
          const poItemRef = db().collection("purchase_order_items").doc(it.poItemId);
          const poItemSnap = await tx.get(poItemRef);
          const poItemData = poItemSnap.data()!;
          tx.update(poItemRef, {
            receivedQuantity: String(Number(poItemData.receivedQuantity) + it.quantity),
          });
        }
      }

      if (b.purchaseOrderId) {
        const poItemsSnap = await db()
          .collection("purchase_order_items")
          .where("purchaseOrderId", "==", b.purchaseOrderId)
          .get();
        const poItems = poItemsSnap.docs.map((d) => d.data());
        const allReceived = poItems.every(
          (p) => Number(p.receivedQuantity) >= Number(p.quantity),
        );
        const anyReceived = poItems.some((p) => Number(p.receivedQuantity) > 0);
        const newStatus = allReceived ? "received" : anyReceived ? "partial" : "sent";
        tx.update(db().collection("purchase_orders").doc(b.purchaseOrderId), {
          status: newStatus,
          updatedAt: new Date().toISOString(),
        });
      }

      const snap = await tx.get(grnRef);
      return { id: grnRef.id, ...snap.data()! };
    });
  } catch (e) {
    req.log.error({ err: e }, "GRN transaction failed");
    res.status(500).json({ error: "Failed to record goods receipt" });
    return;
  }
  await logAction(req, "CREATE", "grn", g.id, `Received ${b.items.length} items`);
  res.status(201).json(await fmt(g));
});

export default grnRouter;
