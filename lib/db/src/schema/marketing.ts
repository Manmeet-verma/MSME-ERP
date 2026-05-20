import { pgTable, serial, text, integer, timestamp, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";

export const emailSuppressionsTable = pgTable(
  "email_suppressions",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    reason: text("reason", { enum: ["unsubscribe", "bounce", "complaint", "manual"] }).notNull().default("manual"),
    unsubscribeToken: text("unsubscribe_token"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("email_suppressions_org_email_idx").on(t.organizationId, t.email)],
);

export const dripSequencesTable = pgTable("drip_sequences", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  trigger: jsonb("trigger").$type<{ entity: "leads" | "clients"; filters?: Record<string, string> }>().notNull(),
  fromEmail: text("from_email").notNull(),
  status: text("status", { enum: ["draft", "active", "paused"] }).notNull().default("draft"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const dripStepsTable = pgTable("drip_steps", {
  id: serial("id").primaryKey(),
  sequenceId: integer("sequence_id").notNull().references(() => dripSequencesTable.id, { onDelete: "cascade" }),
  stepOrder: integer("step_order").notNull(),
  delayDays: integer("delay_days").notNull().default(0),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
});

export const dripEnrollmentsTable = pgTable("drip_enrollments", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  sequenceId: integer("sequence_id").notNull().references(() => dripSequencesTable.id, { onDelete: "cascade" }),
  leadId: integer("lead_id"),
  clientId: integer("client_id"),
  email: text("email").notNull(),
  name: text("name"),
  currentStep: integer("current_step").notNull().default(0),
  status: text("status", { enum: ["active", "completed", "stopped"] }).notNull().default("active"),
  nextSendAt: timestamp("next_send_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertEmailSuppressionSchema = createInsertSchema(emailSuppressionsTable).omit({ id: true, createdAt: true });
export const insertDripSequenceSchema = createInsertSchema(dripSequencesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDripStepSchema = createInsertSchema(dripStepsTable).omit({ id: true });
export const insertDripEnrollmentSchema = createInsertSchema(dripEnrollmentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type EmailSuppression = typeof emailSuppressionsTable.$inferSelect;
export type DripSequence = typeof dripSequencesTable.$inferSelect;
export type DripStep = typeof dripStepsTable.$inferSelect;
export type DripEnrollment = typeof dripEnrollmentsTable.$inferSelect;
export type InsertEmailSuppression = z.infer<typeof insertEmailSuppressionSchema>;
export type InsertDripSequence = z.infer<typeof insertDripSequenceSchema>;
export type InsertDripStep = z.infer<typeof insertDripStepSchema>;
export type InsertDripEnrollment = z.infer<typeof insertDripEnrollmentSchema>;
