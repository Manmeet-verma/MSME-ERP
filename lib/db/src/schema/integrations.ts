import { pgTable, serial, text, integer, timestamp, jsonb, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";

export const integrationsTable = pgTable(
  "integrations",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
    provider: text("provider", {
      enum: ["indiamart", "smtp", "twilio", "tradeindia", "justdial", "fb_lead_ads", "whatsapp"],
    }).notNull(),
    enabled: boolean("enabled").notNull().default(true),
    config: jsonb("config").$type<Record<string, string>>().notNull().default({}),
    lastSyncedAt: timestamp("last_synced_at"),
    lastSyncStatus: text("last_sync_status"),
    lastSyncMessage: text("last_sync_message"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("integrations_org_provider_idx").on(t.organizationId, t.provider)],
);

export const insertIntegrationSchema = createInsertSchema(integrationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertIntegration = z.infer<typeof insertIntegrationSchema>;
export type Integration = typeof integrationsTable.$inferSelect;
