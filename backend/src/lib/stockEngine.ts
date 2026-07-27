import { getDb } from "./firebase";
import { FieldValue } from "firebase-admin/firestore";

const db = () => getDb();

export type MovementReason =
  | "opening"
  | "purchase"
  | "sale"
  | "adjustment"
  | "transfer_in"
  | "transfer_out"
  | "return";

export type DbOrTx = FirebaseFirestore.Transaction;

export interface RecordMovementInput {
  organizationId: string;
  itemId: string;
  warehouseId: string;
  direction: "in" | "out";
  quantity: number;
  unitCost?: number;
  reason: MovementReason;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
  createdById?: string | null;
  executor?: DbOrTx;
}

export async function getStockLevel(
  organizationId: string,
  itemId: string,
  warehouseId?: string,
  executor?: DbOrTx,
): Promise<number> {
  let query: FirebaseFirestore.Query = db()
    .collection("stockMovements")
    .where("organizationId", "==", organizationId)
    .where("itemId", "==", itemId);
  if (warehouseId) {
    query = query.where("warehouseId", "==", warehouseId);
  }
  const snap = await query.get();
  let qty = 0;
  for (const doc of snap.docs) {
    const data = doc.data();
    const movementQty = Number(data.quantity);
    qty += data.direction === "in" ? movementQty : -movementQty;
  }
  return qty;
}

export async function recordMovement(input: RecordMovementInput) {
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    throw new Error("Movement quantity must be a positive number");
  }
  if (!input.executor) {
    return db().runTransaction((tx: FirebaseFirestore.Transaction) => recordMovementInTx({ ...input, executor: tx }));
  }
  return recordMovementInTx(input);
}

async function recordMovementInTx(input: RecordMovementInput) {
  const tx = input.executor!;

  const itemSnap = await db()
    .collection("items")
    .where("id", "==", input.itemId)
    .where("organizationId", "==", input.organizationId)
    .limit(1)
    .get();
  if (itemSnap.empty) throw new Error("Item not found");
  const itemDoc = itemSnap.docs[0];
  const item = itemDoc.data();

  const warehouseSnap = await db()
    .collection("warehouses")
    .where("id", "==", input.warehouseId)
    .where("organizationId", "==", input.organizationId)
    .limit(1)
    .get();
  if (warehouseSnap.empty) throw new Error("Warehouse not found");

  const unitCost = input.unitCost ?? Number(item.avgCost);

  const movementRef = db().collection("stockMovements").doc();
  tx.set(movementRef, {
    organizationId: input.organizationId,
    itemId: input.itemId,
    warehouseId: input.warehouseId,
    direction: input.direction,
    quantity: String(input.quantity),
    unitCost: String(unitCost),
    reason: input.reason,
    referenceType: input.referenceType ?? null,
    referenceId: input.referenceId ?? null,
    notes: input.notes ?? null,
    createdById: input.createdById ?? null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  if (input.direction === "in" && unitCost > 0) {
    const prevSnap = await db()
      .collection("stockMovements")
      .where("organizationId", "==", input.organizationId)
      .where("itemId", "==", input.itemId)
      .get();
    let currentQty = 0;
    for (const doc of prevSnap.docs) {
      if (doc.id === movementRef.id) continue;
      const d = doc.data();
      const qty = Number(d.quantity);
      currentQty += d.direction === "in" ? qty : -qty;
    }
    const currentAvg = Number(item.avgCost);
    const newQty = currentQty + input.quantity;
    const newAvg = newQty > 0 ? (currentQty * currentAvg + input.quantity * unitCost) / newQty : unitCost;
    tx.update(itemDoc.ref, {
      avgCost: newAvg.toFixed(4),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  return { id: movementRef.id };
}

export async function getReservedStock(
  organizationId: string,
  itemId: string,
  warehouseId: string,
  excludeSalesOrderId?: string,
  executor?: DbOrTx,
): Promise<number> {
  let query: FirebaseFirestore.Query = db()
    .collection("stockReservations")
    .where("organizationId", "==", organizationId)
    .where("itemId", "==", itemId)
    .where("warehouseId", "==", warehouseId);
  if (excludeSalesOrderId !== undefined) {
    query = query.where("salesOrderId", "!=", excludeSalesOrderId);
  }
  const snap = await query.get();
  let qty = 0;
  for (const doc of snap.docs) {
    qty += Number(doc.data().quantity);
  }
  return qty;
}

export async function getAvailableStock(
  organizationId: string,
  itemId: string,
  warehouseId: string,
  excludeSalesOrderId?: string,
  executor?: DbOrTx,
): Promise<{ onHand: number; reserved: number; available: number }> {
  const onHand = await getStockLevel(organizationId, itemId, warehouseId, executor);
  const reserved = await getReservedStock(organizationId, itemId, warehouseId, excludeSalesOrderId, executor);
  return { onHand, reserved, available: onHand - reserved };
}

export async function setReservationsForSO(opts: {
  organizationId: string;
  salesOrderId: string;
  lines: Array<{ itemId: string | null; quantity: number }>;
  warehouseId: string;
  executor: DbOrTx;
}): Promise<void> {
  const tx = opts.executor;

  const existingSnap = await db()
    .collection("stockReservations")
    .where("organizationId", "==", opts.organizationId)
    .where("salesOrderId", "==", opts.salesOrderId)
    .get();
  for (const doc of existingSnap.docs) {
    tx.delete(doc.ref);
  }

  const agg = new Map<string, number>();
  for (const l of opts.lines) {
    if (!l.itemId || !(l.quantity > 0)) continue;
    agg.set(l.itemId, (agg.get(l.itemId) ?? 0) + l.quantity);
  }
  if (agg.size === 0) return;

  for (const [itemId, quantity] of agg.entries()) {
    const ref = db().collection("stockReservations").doc();
    tx.set(ref, {
      organizationId: opts.organizationId,
      salesOrderId: opts.salesOrderId,
      itemId,
      warehouseId: opts.warehouseId,
      quantity: String(quantity),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
}

export async function clearReservationsForSO(
  organizationId: string,
  salesOrderId: string,
  executor: DbOrTx,
): Promise<void> {
  const tx = executor;
  const snap = await db()
    .collection("stockReservations")
    .where("organizationId", "==", organizationId)
    .where("salesOrderId", "==", salesOrderId)
    .get();
  for (const doc of snap.docs) {
    tx.delete(doc.ref);
  }
}

export async function ensureDefaultWarehouse(organizationId: string): Promise<string> {
  const snap = await db()
    .collection("warehouses")
    .where("organizationId", "==", organizationId)
    .get();
  if (!snap.empty) {
    const defaultWh = snap.docs.find((d: FirebaseFirestore.QueryDocumentSnapshot) => d.data().isDefault) ?? snap.docs[0];
    return defaultWh.id;
  }
  const ref = db().collection("warehouses").doc();
  await ref.set({
    organizationId,
    name: "Main Warehouse",
    isDefault: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}
