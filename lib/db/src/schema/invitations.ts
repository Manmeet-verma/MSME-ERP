import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";

export const invitationsTable = pgTable("invitations", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .notNull()
    .references(() => organizationsTable.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role", { enum: ["admin", "sales", "viewer"] }).notNull().default("sales"),
  token: text("token").notNull().unique(),
  invitedById: integer("invited_by_id"),
  acceptedAt: timestamp("accepted_at"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Invitation = typeof invitationsTable.$inferSelect;
