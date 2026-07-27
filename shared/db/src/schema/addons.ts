import { pgTable, serial, text, boolean, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";

export const addonsTable = pgTable("addons", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .notNull()
    .references(() => organizationsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  priceType: text("price_type", { enum: ["fixed", "percentage"] }).notNull().default("fixed"),
  category: text("category").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertAddonSchema = createInsertSchema(addonsTable).omit({ id: true });
export type InsertAddon = z.infer<typeof insertAddonSchema>;
export type Addon = typeof addonsTable.$inferSelect;
