import { pgTable, serial, text, integer, timestamp, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";

export const aiInsightsTable = pgTable(
  "ai_insights",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
    forDate: text("for_date").notNull(),
    insights: jsonb("insights").$type<{ headline: string; bullets: string[]; suggestions: string[] }>().notNull(),
    metricsSnapshot: jsonb("metrics_snapshot").$type<Record<string, number>>().notNull().default({}),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("ai_insights_org_date_idx").on(t.organizationId, t.forDate)],
);

export const insertAiInsightSchema = createInsertSchema(aiInsightsTable).omit({ id: true, createdAt: true });
export type AiInsight = typeof aiInsightsTable.$inferSelect;
export type InsertAiInsight = z.infer<typeof insertAiInsightSchema>;
