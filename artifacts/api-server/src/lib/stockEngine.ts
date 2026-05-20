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
}

export async function getStockLevel(
  organizationId: number,
  itemId: number,
  warehouseId?: number,
): Promise<number> {
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
  const [row] = await db
    .select({
      qty: sql<string>`coalesce(sum(case when ${stockMovementsTable.direction} = 'in' then ${stockMovementsTable.quantity} else -${stockMovementsTable.quantity} end),0)::text`,
    })
    .from(stockMovementsTable)
    .where(where);
  return Number(row?.qty ?? 0);
}

export async function recordMovement(input: RecordMovementInput) {
  const [item] = await db
    .select()
    .from(itemsTable)
    .where(and(eq(itemsTable.id, input.itemId), eq(itemsTable.organizationId, input.organizationId)));
  if (!item) throw new Error("Item not found");

  const [warehouse] = await db
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

  const [m] = await db
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
    const currentQty = await getStockLevelExcluding(input.organizationId, input.itemId, m.id);
    const currentAvg = Number(item.avgCost);
    const newQty = currentQty + input.quantity;
    const newAvg =
      newQty > 0
        ? (currentQty * currentAvg + input.quantity * unitCost) / newQty
        : unitCost;
    await db
      .update(itemsTable)
      .set({ avgCost: newAvg.toFixed(4), updatedAt: new Date() })
      .where(eq(itemsTable.id, input.itemId));
  }

  return m;
}

async function getStockLevelExcluding(
  organizationId: number,
  itemId: number,
  excludeMovementId: number,
): Promise<number> {
  const [row] = await db
    .select({
      qty: sql<string>`coalesce(sum(case when ${stockMovementsTable.direction} = 'in' then ${stockMovementsTable.quantity} else -${stockMovementsTable.quantity} end),0)::text`,
    })
    .from(stockMovementsTable)
    .where(
      and(
        eq(stockMovementsTable.organizationId, organizationId),
        eq(stockMovementsTable.itemId, itemId),
        sql`${stockMovementsTable.id} <> ${excludeMovementId}`,
      ),
    );
  return Number(row?.qty ?? 0);
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
