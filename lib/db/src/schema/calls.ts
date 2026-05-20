import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";
import { leadsTable } from "./leads";

export const callsTable = pgTable("calls", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  leadId: integer("lead_id").references(() => leadsTable.id, { onDelete: "set null" }),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  direction: text("direction", { enum: ["outbound", "inbound"] }).notNull().default("outbound"),
  fromNumber: text("from_number"),
  toNumber: text("to_number").notNull(),
  status: text("status", { enum: ["queued", "ringing", "in_progress", "completed", "failed", "busy", "no_answer"] }).notNull().default("queued"),
  twilioSid: text("twilio_sid"),
  durationSec: integer("duration_sec"),
  recordingUrl: text("recording_url"),
  transcript: text("transcript"),
  aiSummary: text("ai_summary"),
  notes: text("notes"),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCallSchema = createInsertSchema(callsTable).omit({ id: true, createdAt: true });
export type InsertCall = z.infer<typeof insertCallSchema>;
export type Call = typeof callsTable.$inferSelect;
