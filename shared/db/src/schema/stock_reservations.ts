import { pgTable, serial, integer, numeric, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { itemsTable } from "./items";
import { warehousesTable } from "./warehouses";
import { salesOrdersTable } from "./sales_orders";

export const stockReservationsTable = pgTable(
  "stock_reservations",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    salesOrderId: integer("sales_order_id")
      .notNull()
      .references(() => salesOrdersTable.id, { onDelete: "cascade" }),
    itemId: integer("item_id")
      .notNull()
      .references(() => itemsTable.id, { onDelete: "cascade" }),
    warehouseId: integer("warehouse_id")
      .notNull()
      .references(() => warehousesTable.id, { onDelete: "cascade" }),
    quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    soItemWhUq: uniqueIndex("stock_reservations_so_item_wh_uq").on(
      t.salesOrderId,
      t.itemId,
      t.warehouseId,
    ),
  }),
);

export const insertStockReservationSchema = createInsertSchema(stockReservationsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertStockReservation = z.infer<typeof insertStockReservationSchema>;
export type StockReservation = typeof stockReservationsTable.$inferSelect;
