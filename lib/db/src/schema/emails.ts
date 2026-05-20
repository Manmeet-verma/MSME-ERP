import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";
import { leadsTable } from "./leads";
import { clientsTable } from "./clients";

export const emailsTable = pgTable("emails", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  leadId: integer("lead_id").references(() => leadsTable.id, { onDelete: "set null" }),
  clientId: integer("client_id").references(() => clientsTable.id, { onDelete: "set null" }),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  direction: text("direction", { enum: ["outbound", "inbound"] }).notNull().default("outbound"),
  fromEmail: text("from_email").notNull(),
  toEmail: text("to_email").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: text("status", { enum: ["draft", "queued", "sent", "delivered", "opened", "clicked", "bounced", "failed"] }).notNull().default("queued"),
  messageId: text("message_id"),
  threadId: text("thread_id"),
  inReplyTo: text("in_reply_to"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertEmailSchema = createInsertSchema(emailsTable).omit({ id: true, createdAt: true });
export type InsertEmail = z.infer<typeof insertEmailSchema>;
export type Email = typeof emailsTable.$inferSelect;
