import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { leadsTable } from "./leads";
import { clientsTable } from "./clients";

export const whatsappMessagesTable = pgTable("whatsapp_messages", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  leadId: integer("lead_id").references(() => leadsTable.id, { onDelete: "set null" }),
  clientId: integer("client_id").references(() => clientsTable.id, { onDelete: "set null" }),
  direction: text("direction", { enum: ["inbound", "outbound"] }).notNull(),
  phone: text("phone").notNull(),
  body: text("body"),
  templateName: text("template_name"),
  templateLanguage: text("template_language"),
  templateVariables: jsonb("template_variables").$type<string[]>(),
  status: text("status", { enum: ["queued", "sent", "delivered", "read", "failed", "received"] }).notNull().default("queued"),
  providerMessageId: text("provider_message_id"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertWhatsappMessageSchema = createInsertSchema(whatsappMessagesTable).omit({ id: true, createdAt: true });
export type InsertWhatsappMessage = z.infer<typeof insertWhatsappMessageSchema>;
export type WhatsappMessage = typeof whatsappMessagesTable.$inferSelect;
