import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { clientsTable } from "./clients";
import { usersTable } from "./users";
import { warehousesTable } from "./warehouses";
import { itemsTable } from "./items";

export const salesOrdersTable = pgTable("sales_orders", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  orderNumber: text("order_number").notNull(),
  clientId: integer("client_id").references(() => clientsTable.id, { onDelete: "set null" }),
  quotationId: integer("quotation_id"),
  warehouseId: integer("warehouse_id").references(() => warehousesTable.id, { onDelete: "set null" }),
  status: text("status", { enum: ["draft", "confirmed", "in_production", "delivered", "cancelled"] }).notNull().default("draft"),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
  expectedDeliveryAt: timestamp("expected_delivery_at"),
  notes: text("notes"),
  createdById: integer("created_by_id").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const salesOrderItemsTable = pgTable("sales_order_items", {
  id: serial("id").primaryKey(),
  salesOrderId: integer("sales_order_id").notNull().references(() => salesOrdersTable.id, { onDelete: "cascade" }),
  itemId: integer("item_id").references(() => itemsTable.id, { onDelete: "set null" }),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  totalPrice: numeric("total_price", { precision: 12, scale: 2 }).notNull(),
});

export const insertSalesOrderSchema = createInsertSchema(salesOrdersTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSalesOrderItemSchema = createInsertSchema(salesOrderItemsTable).omit({ id: true });
export type InsertSalesOrder = z.infer<typeof insertSalesOrderSchema>;
export type SalesOrder = typeof salesOrdersTable.$inferSelect;
export type SalesOrderItem = typeof salesOrderItemsTable.$inferSelect;
