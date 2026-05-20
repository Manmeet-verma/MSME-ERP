import {
  db,
  stockMovementsTable,
  itemsTable,
  warehousesTable,
} from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";

export type MovementReason =
  | "opening"
  | "purchase"
  | "sale"
  | "adjustment"
  | "transfer_in"
  | "transfer_out"
  | "return";

export type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface RecordMovementInput {
  organizationId: number;
  itemId: number;
  warehouseId: number;
  direction: "in" | "out";
  quantity: number;
  unitCost?: number;
  reason: MovementReason;
  referenceType?: string;
  referenceId?: number;
  notes?: string;
  createdById?: number | null;
  /** Optional transaction handle. Defaults to top-level db. */
  executor?: DbOrTx;
}

export async function getStockLevel(
  organizationId: number,
  itemId: number,
  warehouseId?: number,
  executor?: DbOrTx,
): Promise<number> {
  const exec = (executor ?? db) as typeof db;
  const where = warehouseId
    ? and(
        eq(stockMovementsTable.organizationId, organizationId),
        eq(stockMovementsTable.itemId, itemId),
        eq(stockMovementsTable.warehouseId, warehouseId),
      )
    : and(
        eq(stockMovementsTable.organizationId, organizationId),
        eq(stockMovementsTable.itemId, itemId),
      );
  const [row] = await exec
    .select({
      qty: sql<string>`coalesce(sum(case when ${stockMovementsTable.direction} = 'in' then ${stockMovementsTable.quantity} else -${stockMovementsTable.quantity} end),0)::text`,
    })
    .from(stockMovementsTable)
    .where(where);
  return Number(row?.qty ?? 0);
}

export async function recordMovement(input: RecordMovementInput) {
  const exec = (input.executor ?? db) as typeof db;
  const [item] = await exec
    .select()
    .from(itemsTable)
    .where(and(eq(itemsTable.id, input.itemId), eq(itemsTable.organizationId, input.organizationId)));
  if (!item) throw new Error("Item not found");

  const [warehouse] = await exec
    .select()
    .from(warehousesTable)
    .where(
      and(
        eq(warehousesTable.id, input.warehouseId),
        eq(warehousesTable.organizationId, input.organizationId),
      ),
    );
  if (!warehouse) throw new Error("Warehouse not found");

  const unitCost = input.unitCost ?? Number(item.avgCost);

  const [m] = await exec
    .insert(stockMovementsTable)
    .values({
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
    })
    .returning();

  // Update moving average cost on IN movements with positive unitCost
  if (input.direction === "in" && unitCost > 0) {
    const [row] = await exec
      .select({
        qty: sql<string>`coalesce(sum(case when ${stockMovementsTable.direction} = 'in' then ${stockMovementsTable.quantity} else -${stockMovementsTable.quantity} end),0)::text`,
      })
      .from(stockMovementsTable)
      .where(
        and(
          eq(stockMovementsTable.organizationId, input.organizationId),
          eq(stockMovementsTable.itemId, input.itemId),
          sql`${stockMovementsTable.id} <> ${m.id}`,
        ),
      );
    const currentQty = Number(row?.qty ?? 0);
    const currentAvg = Number(item.avgCost);
    const newQty = currentQty + input.quantity;
    const newAvg =
      newQty > 0
        ? (currentQty * currentAvg + input.quantity * unitCost) / newQty
        : unitCost;
    await exec
      .update(itemsTable)
      .set({ avgCost: newAvg.toFixed(4), updatedAt: new Date() })
      .where(eq(itemsTable.id, input.itemId));
  }

  return m;
}

export async function ensureDefaultWarehouse(organizationId: number): Promise<number> {
  const existing = await db
    .select()
    .from(warehousesTable)
    .where(eq(warehousesTable.organizationId, organizationId));
  if (existing.length > 0) {
    const def = existing.find((w) => w.isDefault) ?? existing[0];
    return def.id;
  }
  const [w] = await db
    .insert(warehousesTable)
    .values({
      organizationId,
      name: "Main Warehouse",
      isDefault: true,
    })
    .returning();
  return w.id;
}
