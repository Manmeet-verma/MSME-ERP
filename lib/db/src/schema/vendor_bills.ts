import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { vendorsTable } from "./vendors";
import { purchaseOrdersTable } from "./purchase_orders";
import { itemsTable } from "./items";
import { usersTable } from "./users";

export const vendorBillsTable = pgTable("vendor_bills", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  billNumber: text("bill_number").notNull(),
  vendorId: integer("vendor_id").references(() => vendorsTable.id, { onDelete: "set null" }),
  purchaseOrderId: integer("purchase_order_id").references(() => purchaseOrdersTable.id, { onDelete: "set null" }),
  status: text("status", { enum: ["draft", "open", "partial", "paid", "overdue", "cancelled"] }).notNull().default("open"),
  issueDate: timestamp("issue_date").notNull().defaultNow(),
  dueDate: timestamp("due_date"),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
  amountPaid: numeric("amount_paid", { precision: 12, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  createdById: integer("created_by_id").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const vendorBillItemsTable = pgTable("vendor_bill_items", {
  id: serial("id").primaryKey(),
  vendorBillId: integer("vendor_bill_id").notNull().references(() => vendorBillsTable.id, { onDelete: "cascade" }),
  itemId: integer("item_id").references(() => itemsTable.id, { onDelete: "set null" }),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  totalPrice: numeric("total_price", { precision: 12, scale: 2 }).notNull(),
});

export const insertVendorBillSchema = createInsertSchema(vendorBillsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertVendorBillItemSchema = createInsertSchema(vendorBillItemsTable).omit({ id: true });
export type InsertVendorBill = z.infer<typeof insertVendorBillSchema>;
export type VendorBill = typeof vendorBillsTable.$inferSelect;
export type VendorBillItem = typeof vendorBillItemsTable.$inferSelect;
