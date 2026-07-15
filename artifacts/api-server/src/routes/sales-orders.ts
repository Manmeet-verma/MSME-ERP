import { Router } from "express";
import { getDb } from "../lib/firebase";
import { requireAuth } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";
import {
  recordMovement,
  ensureDefaultWarehouse,
  getStockLevel,
  getReservedStock,
  setReservationsForSO,
  clearReservationsForSO,
} from "../lib/stockEngine";

const db = () => getDb();

const DEFAULT_SALES_SETTINGS = {
  allowOverselling: false,
  reserveStockOnDraft: false,
} as const;

type OrgSalesSettings = Record<keyof typeof DEFAULT_SALES_SETTINGS, boolean>;

async function getSalesSettings(organizationId: string): Promise<OrgSalesSettings> {
  const orgDoc = await db().collection("organizations").doc(organizationId).get();
  const org = orgDoc.exists ? orgDoc.data() : null;
  return { ...DEFAULT_SALES_SETTINGS, ...(org?.salesSettings ?? {}) };
}

async function resolveSOWarehouse(organizationId: string, soWarehouseId: string | null): Promise<string> {
  if (soWarehouseId) return soWarehouseId;
  return ensureDefaultWarehouse(organizationId as any) as any;
}

async function postSOMovements(opts: {
  organizationId: string;
  salesOrderId: string;
  lines: Array<{ itemId: string | null; quantity: number }>;
  warehouseId: string;
  direction: "in" | "out";
  reason: "sale" | "return";
  userId: string;
}) {
  const linkedIds = opts.lines.map((i) => i.itemId).filter((x): x is string => x != null);
  if (linkedIds.length === 0) return;
  const itemDocs = await Promise.all(
    linkedIds.map((id) => db().collection("items").doc(id).get()),
  );
  const linkedMap = new Map(
    itemDocs
      .filter((d) => d.exists && (d.data() as any).organizationId === opts.organizationId)
      .map((d) => [d.id, { id: d.id, ...d.data() }]),
  );
  for (const it of opts.lines) {
    if (!it.itemId) continue;
    const linked = linkedMap.get(it.itemId);
    if (!linked) continue;
    await recordMovement({
      organizationId: opts.organizationId as any,
      itemId: it.itemId as any,
      warehouseId: opts.warehouseId as any,
      direction: opts.direction,
      quantity: it.quantity,
      unitCost: Number(linked.avgCost),
      reason: opts.reason,
      referenceType: "sales_order",
      referenceId: opts.salesOrderId as any,
      createdById: opts.userId as any,
    });
  }
}

const salesOrdersRouter = Router();

function genNumber() {
  const d = new Date();
  return `SO-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}-${Math.floor(Math.random() * 9000) + 1000}`;
}

async function fmt(s: Record<string, any>) {
  let clientName: string | null = null;
  if (s.clientId) {
    const clientDoc = await db().collection("clients").doc(s.clientId).get();
    if (clientDoc.exists) clientName = (clientDoc.data() as any).name ?? null;
  }
  return {
    id: s.id,
    orderNumber: s.orderNumber,
    clientId: s.clientId ?? null,
    clientName,
    quotationId: s.quotationId ?? null,
    warehouseId: s.warehouseId ?? null,
    status: s.status,
    subtotal: Number(s.subtotal),
    discountAmount: Number(s.discountAmount),
    taxAmount: Number(s.taxAmount),
    total: Number(s.total),
    expectedDeliveryAt: s.expectedDeliveryAt ?? null,
    notes: s.notes ?? null,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

async function recalc(soId: string) {
  const itemsSnap = await db().collection("sales_order_items").where("salesOrderId", "==", soId).get();
  const items = itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const subtotal = items.reduce((acc: number, i: any) => acc + Number(i.totalPrice), 0);
  const tax = subtotal * 0.18;
  await db().collection("sales_orders").doc(soId).update({
    subtotal: subtotal.toFixed(2),
    taxAmount: tax.toFixed(2),
    total: (subtotal + tax).toFixed(2),
    updatedAt: new Date().toISOString(),
  });
}

async function validateSOOwnership(
  orgId: string,
  b: { warehouseId?: string | null; items?: Array<{ itemId?: string | null }> },
): Promise<string | null> {
  if (b.warehouseId) {
    const wDoc = await db().collection("warehouses").doc(b.warehouseId).get();
    if (!wDoc.exists || (wDoc.data() as any).organizationId !== orgId) return "Invalid warehouse";
  }
  if (Array.isArray(b.items)) {
    const ids = Array.from(new Set(b.items.map((i) => i.itemId).filter((x): x is string => x != null)));
    if (ids.length > 0) {
      const itemDocs = await Promise.all(ids.map((id) => db().collection("items").doc(id).get()));
      const ownedCount = itemDocs.filter((d) => d.exists && (d.data() as any).organizationId === orgId).length;
      if (ownedCount !== ids.length) return "One or more items not found in this organization";
    }
  }
  return null;
}

salesOrdersRouter.get("/sales-orders", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const snap = await db().collection("sales_orders").where("organizationId", "==", orgId).orderBy("createdAt", "desc").get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  res.json(await Promise.all(rows.map(fmt)));
});

salesOrdersRouter.post("/sales-orders", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const b = req.body ?? {};
  const ownErr = await validateSOOwnership(orgId, b);
  if (ownErr) {
    res.status(400).json({ error: ownErr });
    return;
  }
  if (b.status !== undefined && b.status !== "draft") {
    res
      .status(400)
      .json({ error: "Sales orders must be created in draft. Confirm via PATCH to deduct stock." });
    return;
  }
  const now = new Date().toISOString();
  const soData = {
    organizationId: orgId,
    orderNumber: genNumber(),
    clientId: b.clientId ?? null,
    warehouseId: b.warehouseId ?? null,
    status: "draft",
    subtotal: "0",
    discountAmount: "0",
    taxAmount: "0",
    total: "0",
    expectedDeliveryAt: b.expectedDeliveryAt ? new Date(b.expectedDeliveryAt).toISOString() : null,
    notes: b.notes ?? null,
    createdById: req.user!.userId,
    createdAt: now,
    updatedAt: now,
  };
  const soRef = await db().collection("sales_orders").add(soData);
  const s = { id: soRef.id, ...soData };

  if (Array.isArray(b.items) && b.items.length > 0) {
    const itemPromises = b.items.map(
      async (it: { itemId?: string | null; description: string; quantity: number; unitPrice: number }) => {
        const itemData = {
          salesOrderId: s.id,
          itemId: it.itemId ?? null,
          description: it.description,
          quantity: it.quantity,
          unitPrice: String(it.unitPrice),
          totalPrice: (it.quantity * it.unitPrice).toFixed(2),
        };
        const ref = await db().collection("sales_order_items").add(itemData);
        return { id: ref.id, ...itemData };
      },
    );
    await Promise.all(itemPromises);
    await recalc(s.id);
  }

  const settings = await getSalesSettings(orgId);
  if (settings.reserveStockOnDraft && Array.isArray(b.items) && b.items.length > 0) {
    const whId = await resolveSOWarehouse(orgId, s.warehouseId ?? null);
    await setReservationsForSO({
      organizationId: orgId as any,
      salesOrderId: s.id as any,
      lines: b.items.map((it: { itemId?: string | null; quantity: number }) => ({
        itemId: it.itemId as any,
        quantity: it.quantity,
      })),
      warehouseId: whId as any,
    } as any);
  }

  const updatedDoc = await db().collection("sales_orders").doc(s.id).get();
  const updated = { id: updatedDoc.id, ...updatedDoc.data() };
  await logAction(req, "CREATE", "sales_order", s.id as any);
  res.status(201).json(await fmt(updated));
});

salesOrdersRouter.get("/sales-orders/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = req.params.id;
  const soDoc = await db().collection("sales_orders").doc(id).get();
  if (!soDoc.exists || (soDoc.data() as any).organizationId !== orgId) {
    res.status(404).json({ error: "Sales order not found" });
    return;
  }
  const s = { id: soDoc.id, ...soDoc.data() } as Record<string, any>;

  const itemsSnap = await db().collection("sales_order_items").where("salesOrderId", "==", id).get();
  const items = itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const whId = await resolveSOWarehouse(orgId, s.warehouseId ?? null);
  const warehousesSnap = await db().collection("warehouses").where("organizationId", "==", orgId).get();
  const warehouses = warehousesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const linkedItemIds = Array.from(
    new Set(items.map((i: any) => i.itemId).filter((x): x is string => x != null)),
  );
  const availability = new Map<string, Array<{ warehouseId: string; warehouseName: string; isOrderWarehouse: boolean; onHand: number; reserved: number; available: number }>>();
  for (const itemId of linkedItemIds) {
    const rows: Array<{ warehouseId: string; warehouseName: string; isOrderWarehouse: boolean; onHand: number; reserved: number; available: number }> = [];
    for (const wh of warehouses) {
      const onHand = await getStockLevel(orgId as any, itemId as any, wh.id as any);
      const reserved = await getReservedStock(orgId as any, itemId as any, wh.id as any, id as any);
      rows.push({
        warehouseId: wh.id,
        warehouseName: (wh as any).name,
        isOrderWarehouse: wh.id === whId,
        onHand,
        reserved,
        available: onHand - reserved,
      });
    }
    availability.set(itemId, rows);
  }

  res.json({
    ...(await fmt(s)),
    items: items.map((i: any) => ({
      id: i.id,
      itemId: i.itemId ?? null,
      description: i.description,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      totalPrice: Number(i.totalPrice),
      availability: i.itemId ? (availability.get(i.itemId) ?? []) : [],
    })),
  });
});

salesOrdersRouter.patch("/sales-orders/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = req.params.id;
  const b = req.body ?? {};
  const ownErr = await validateSOOwnership(orgId, b);
  if (ownErr) {
    res.status(400).json({ error: ownErr });
    return;
  }

  const prevDoc = await db().collection("sales_orders").doc(id).get();
  if (!prevDoc.exists || (prevDoc.data() as any).organizationId !== orgId) {
    res.status(404).json({ error: "Sales order not found" });
    return;
  }
  const prev = { id: prevDoc.id, ...prevDoc.data() } as Record<string, any>;

  const wasActive = ["confirmed", "in_production", "delivered"].includes(prev.status);
  const stillActive =
    b.status === undefined || ["confirmed", "in_production", "delivered"].includes(b.status);
  if (Array.isArray(b.items) && wasActive && stillActive) {
    res.status(409).json({ error: "Revert sales order to draft before editing line items" });
    return;
  }
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

  const prevLinesSnap = await db().collection("sales_order_items").where("salesOrderId", "==", id).get();
  const prevLines = prevLinesSnap.docs.map((d) => ({ itemId: (d.data() as any).itemId ?? null, quantity: (d.data() as any).quantity }));
  const prevWarehouseId = await resolveSOWarehouse(orgId, prev.warehouseId ?? null);

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  for (const f of ["clientId", "warehouseId", "status", "notes"] as const) {
    if (b[f] !== undefined) updates[f] = b[f];
  }
  if (b.expectedDeliveryAt !== undefined) updates.expectedDeliveryAt = b.expectedDeliveryAt ? new Date(b.expectedDeliveryAt).toISOString() : null;

  const becomingActive =
    b.status !== undefined &&
    !wasActive &&
    ["confirmed", "in_production", "delivered"].includes(b.status);
  const becomingDead =
    b.status !== undefined && wasActive && ["cancelled", "draft"].includes(b.status);
  const settings = await getSalesSettings(orgId);
  const willEndAsDraft = b.status !== undefined ? b.status === "draft" : prev.status === "draft";
  const willBeCancelled =
    b.status !== undefined ? b.status === "cancelled" : prev.status === "cancelled";

  try {
    await db().runTransaction(async (tx) => {
      tx.update(db().collection("sales_orders").doc(id), updates);

      if (becomingDead) {
        await postSOMovements({
          organizationId: orgId,
          salesOrderId: id,
          lines: prevLines,
          warehouseId: prevWarehouseId,
          direction: "in",
          reason: "return",
          userId: req.user!.userId,
        });
      }

      if (Array.isArray(b.items)) {
        const existingSnap = await db().collection("sales_order_items").where("salesOrderId", "==", id).get();
        for (const doc of existingSnap.docs) {
          tx.delete(doc.ref);
        }
        if (b.items.length > 0) {
          for (const it of b.items) {
            const itemData = {
              salesOrderId: id,
              itemId: it.itemId ?? null,
              description: it.description,
              quantity: it.quantity,
              unitPrice: String(it.unitPrice),
              totalPrice: (it.quantity * it.unitPrice).toFixed(2),
            };
            const ref = db().collection("sales_order_items").doc();
            tx.set(ref, itemData);
          }
        }

        const linesSnap = await db().collection("sales_order_items").where("salesOrderId", "==", id).get();
        const lines = linesSnap.docs.map((d) => d.data());
        const subtotal = lines.reduce((acc: number, l: any) => acc + Number(l.totalPrice), 0);
        const total = subtotal;
        tx.update(db().collection("sales_orders").doc(id), {
          subtotal: subtotal.toFixed(2),
          total: total.toFixed(2),
          updatedAt: new Date().toISOString(),
        });
      }

      if (becomingActive) {
        const currentRowsSnap = await db().collection("sales_order_items").where("salesOrderId", "==", id).get();
        const currentRows = currentRowsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const unlinked = currentRows
          .filter((l: any) => l.itemId == null)
          .map((l: any) => ({ id: l.id, description: l.description, quantity: l.quantity }));
        if (unlinked.length > 0) {
          const err = new Error("UNLINKED_LINES");
          (err as any).unlinkedLines = unlinked;
          throw err;
        }
        const currentLines = currentRows.map((l: any) => ({ itemId: l.itemId ?? null, quantity: l.quantity }));

        const refreshedDoc = await db().collection("sales_orders").doc(id).get();
        const refreshed = refreshedDoc.data() as Record<string, any>;
        const whId = await resolveSOWarehouse(orgId, refreshed.warehouseId ?? null);

        const need = new Map<string, number>();
        for (const l of currentLines) {
          if (!l.itemId) continue;
          need.set(l.itemId, (need.get(l.itemId) ?? 0) + l.quantity);
        }
        const shortages: Array<{ itemId: string; needed: number; available: number }> = [];
        for (const [itemId, needed] of need) {
          const have = await getStockLevel(orgId as any, itemId as any, whId as any);
          const reserved = await getReservedStock(orgId as any, itemId as any, whId as any, id as any);
          const available = have - reserved;
          if (available < needed) shortages.push({ itemId, needed, available });
        }
        if (shortages.length > 0 && !settings.allowOverselling) {
          const err = new Error("INSUFFICIENT_STOCK");
          (err as any).shortages = shortages;
          throw err;
        }
        if (shortages.length > 0) {
          req.log.warn({ shortages, salesOrderId: id }, "SO confirmed with overselling allowed");
        }

        await postSOMovements({
          organizationId: orgId,
          salesOrderId: id,
          lines: currentLines,
          warehouseId: whId,
          direction: "out",
          reason: "sale",
          userId: req.user!.userId,
        });
        await clearReservationsForSO(orgId as any, id as any);
      }

      if (willBeCancelled) {
        await clearReservationsForSO(orgId as any, id as any);
      } else if (willEndAsDraft) {
        if (settings.reserveStockOnDraft) {
          const finalLinesSnap = await db().collection("sales_order_items").where("salesOrderId", "==", id).get();
          const finalLines = finalLinesSnap.docs.map((d) => ({ itemId: (d.data() as any).itemId ?? null, quantity: (d.data() as any).quantity }));
          const refreshedDoc = await db().collection("sales_orders").doc(id).get();
          const refreshed = refreshedDoc.data() as Record<string, any>;
          const whId = await resolveSOWarehouse(orgId, refreshed.warehouseId ?? null);
          await setReservationsForSO({
            organizationId: orgId as any,
            salesOrderId: id as any,
            lines: finalLines.map((l) => ({ itemId: l.itemId as any, quantity: l.quantity })),
            warehouseId: whId as any,
          } as any);
        } else {
          await clearReservationsForSO(orgId as any, id as any);
        }
      }
    });
  } catch (e) {
    const msg = (e as Error).message;
    const shortages = (e as { shortages?: unknown }).shortages;
    const unlinkedLines = (e as { unlinkedLines?: unknown }).unlinkedLines;
    if (msg === "INSUFFICIENT_STOCK" && Array.isArray(shortages)) {
      req.log.warn({ shortages }, "SO confirmation blocked by insufficient stock");
      res.status(409).json({ error: "Insufficient stock to confirm sales order", shortages });
      return;
    }
    if (msg === "UNLINKED_LINES" && Array.isArray(unlinkedLines)) {
      req.log.warn({ unlinkedLines }, "SO confirmation blocked by unlinked lines");
      res.status(409).json({
        error: "Link every line to an inventory item before confirming",
        unlinkedLines,
      });
      return;
    }
    req.log.error({ err: e }, "SO patch transaction failed; nothing committed");
    res.status(500).json({ error: "Sales order update failed; no changes applied" });
    return;
  }

  const updatedDoc = await db().collection("sales_orders").doc(id).get();
  const updated = { id: updatedDoc.id, ...updatedDoc.data() } as Record<string, any>;
  res.json(await fmt(updated));
});

salesOrdersRouter.post("/sales-orders/from-quotation/:quotationId", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const qid = req.params.quotationId;

  const qDoc = await db().collection("quotations").doc(qid).get();
  if (!qDoc.exists || (qDoc.data() as any).organizationId !== orgId) {
    res.status(404).json({ error: "Quotation not found" });
    return;
  }
  const q = { id: qDoc.id, ...qDoc.data() } as Record<string, any>;

  const itemsSnap = await db().collection("quotation_items").where("quotationId", "==", qid).get();
  const items = itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const now = new Date().toISOString();
  const soData = {
    organizationId: orgId,
    orderNumber: genNumber(),
    clientId: q.clientId,
    quotationId: qid,
    status: "draft",
    subtotal: q.subtotal,
    discountAmount: q.discountAmount,
    taxAmount: q.taxAmount,
    total: q.total,
    createdById: req.user!.userId,
    createdAt: now,
    updatedAt: now,
  };
  const soRef = await db().collection("sales_orders").add(soData);
  const s = { id: soRef.id, ...soData };

  if (items.length > 0) {
    for (const i of items) {
      const itemData = {
        salesOrderId: s.id,
        itemId: i.itemId ?? null,
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
      };
      await db().collection("sales_order_items").add(itemData);
    }
  }

  const settings = await getSalesSettings(orgId);
  if (settings.reserveStockOnDraft && items.length > 0) {
    const whId = await resolveSOWarehouse(orgId, s.warehouseId ?? null);
    await setReservationsForSO({
      organizationId: orgId as any,
      salesOrderId: s.id as any,
      lines: items.map((i: any) => ({
        itemId: i.itemId as any,
        quantity: Number(i.quantity),
      })),
      warehouseId: whId as any,
    } as any);
  }

  await logAction(req, "PROMOTE", "sales_order", s.id as any, `From quotation ${q.quotationNumber}`);
  res.status(201).json(await fmt(s));
});

export default salesOrdersRouter;
