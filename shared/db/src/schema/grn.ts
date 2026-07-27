import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { purchaseOrdersTable, purchaseOrderItemsTable } from "./purchase_orders";
import { warehousesTable } from "./warehouses";
import { itemsTable } from "./items";
import { usersTable } from "./users";

export const grnTable = pgTable("grn", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  grnNumber: text("grn_number").notNull(),
  purchaseOrderId: integer("purchase_order_id").references(() => purchaseOrdersTable.id, { onDelete: "set null" }),
  warehouseId: integer("warehouse_id").notNull().references(() => warehousesTable.id, { onDelete: "restrict" }),
  receivedAt: timestamp("received_at").notNull().defaultNow(),
  notes: text("notes"),
  createdById: integer("created_by_id").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const grnItemsTable = pgTable("grn_items", {
  id: serial("id").primaryKey(),
  grnId: integer("grn_id").notNull().references(() => grnTable.id, { onDelete: "cascade" }),
  poItemId: integer("po_item_id").references(() => purchaseOrderItemsTable.id, { onDelete: "set null" }),
  itemId: integer("item_id").notNull().references(() => itemsTable.id, { onDelete: "restrict" }),
  quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull(),
  unitCost: numeric("unit_cost", { precision: 12, scale: 4 }).notNull(),
});

export const insertGrnSchema = createInsertSchema(grnTable).omit({ id: true, createdAt: true });
export const insertGrnItemSchema = createInsertSchema(grnItemsTable).omit({ id: true });
export type InsertGrn = z.infer<typeof insertGrnSchema>;
export type Grn = typeof grnTable.$inferSelect;
export type GrnItem = typeof grnItemsTable.$inferSelect;
