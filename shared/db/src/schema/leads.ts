import { pgTable, serial, text, integer, numeric, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";

export const leadsTable = pgTable("leads", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  city: text("city"),
  state: text("state"),
  source: text("source", {
    enum: ["manual", "indiamart", "tradeindia", "justdial", "fb_lead_ads", "whatsapp", "website", "other"],
  }).notNull().default("manual"),
  externalId: text("external_id"),
  status: text("status", { enum: ["new", "contacted", "qualified", "won", "lost"] }).notNull().default("new"),
  priority: text("priority", { enum: ["hot", "warm", "cold"] }).notNull().default("warm"),
  score: integer("score").notNull().default(50),
  budget: numeric("budget", { precision: 12, scale: 2 }),
  product: text("product"),
  notes: text("notes"),
  nextAction: text("next_action"),
  assignedToId: integer("assigned_to_id").references(() => usersTable.id, { onDelete: "set null" }),
  createdById: integer("created_by_id").references(() => usersTable.id, { onDelete: "set null" }),
  convertedClientId: integer("converted_client_id"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  lastContactedAt: timestamp("last_contacted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const leadActivitiesTable = pgTable("lead_activities", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  leadId: integer("lead_id").notNull().references(() => leadsTable.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["note", "call", "email", "status_change", "task", "conversion"] }).notNull(),
  title: text("title").notNull(),
  body: text("body"),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertLeadSchema = createInsertSchema(leadsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLeadActivitySchema = createInsertSchema(leadActivitiesTable).omit({ id: true, createdAt: true });
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leadsTable.$inferSelect;
export type LeadActivity = typeof leadActivitiesTable.$inferSelect;
