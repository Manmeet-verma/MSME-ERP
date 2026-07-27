import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { itemsTable } from "./items";
import { warehousesTable } from "./warehouses";
import { usersTable } from "./users";

export const stockMovementsTable = pgTable("stock_movements", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  itemId: integer("item_id").notNull().references(() => itemsTable.id, { onDelete: "cascade" }),
  warehouseId: integer("warehouse_id").notNull().references(() => warehousesTable.id, { onDelete: "cascade" }),
  direction: text("direction", { enum: ["in", "out"] }).notNull(),
  quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull(),
  unitCost: numeric("unit_cost", { precision: 12, scale: 4 }).notNull().default("0"),
  reason: text("reason", { enum: ["opening", "purchase", "sale", "adjustment", "transfer_in", "transfer_out", "return"] }).notNull(),
  referenceType: text("reference_type"),
  referenceId: integer("reference_id"),
  notes: text("notes"),
  createdById: integer("created_by_id").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertStockMovementSchema = createInsertSchema(stockMovementsTable).omit({ id: true, createdAt: true });
export type InsertStockMovement = z.infer<typeof insertStockMovementSchema>;
export type StockMovement = typeof stockMovementsTable.$inferSelect;
