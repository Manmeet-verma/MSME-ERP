import { pgTable, serial, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const DEFAULT_MODULES = {
  sales: true,
  leads: true,
  inventory: false,
  purchase: false,
  marketing: false,
  hr: false,
  accounting: false,
  social: false,
} as const;

export const DEFAULT_LIMITS = {
  members: 3,
  leadsPerMonth: 50,
  emailsPerMonth: 100,
  storageMB: 100,
} as const;

export type OrgModules = Record<keyof typeof DEFAULT_MODULES, boolean>;
export type OrgLimits = Record<keyof typeof DEFAULT_LIMITS, number>;

export const organizationsTable = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  plan: text("plan", { enum: ["free", "starter", "pro"] }).notNull().default("free"),
  limits: jsonb("limits").$type<OrgLimits>().notNull().default(DEFAULT_LIMITS as unknown as OrgLimits),
  modules: jsonb("modules").$type<OrgModules>().notNull().default(DEFAULT_MODULES as unknown as OrgModules),
  industry: text("industry"),
  gstNumber: text("gst_number"),
  state: text("state"),
  address: text("address"),
  phone: text("phone"),
  createdById: integer("created_by_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOrganizationSchema = createInsertSchema(organizationsTable).omit({
  id: true, createdAt: true,
});
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizationsTable.$inferSelect;
