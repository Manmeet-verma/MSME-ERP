import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";

export const campaignsTable = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  fromEmail: text("from_email").notNull(),
  segment: jsonb("segment").$type<{ entity: "leads" | "clients"; filters?: Record<string, string> }>().notNull(),
  status: text("status", { enum: ["draft", "scheduled", "sending", "sent", "cancelled"] }).notNull().default("draft"),
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  stats: jsonb("stats").$type<{ total: number; sent: number; opened: number; clicked: number }>().notNull().default({ total: 0, sent: 0, opened: 0, clicked: 0 }),
  createdById: integer("created_by_id").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const campaignRecipientsTable = pgTable("campaign_recipients", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => campaignsTable.id, { onDelete: "cascade" }),
  organizationId: integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  name: text("name"),
  leadId: integer("lead_id"),
  clientId: integer("client_id"),
  status: text("status", { enum: ["pending", "sent", "opened", "clicked", "bounced", "failed"] }).notNull().default("pending"),
  sentAt: timestamp("sent_at"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
});

export const insertCampaignSchema = createInsertSchema(campaignsTable).omit({ id: true, createdAt: true, updatedAt: true, sentAt: true, stats: true });
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof campaignsTable.$inferSelect;
export type CampaignRecipient = typeof campaignRecipientsTable.$inferSelect;
