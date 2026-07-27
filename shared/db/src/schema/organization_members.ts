import { pgTable, serial, integer, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";

export const organizationMembersTable = pgTable(
  "organization_members",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["owner", "admin", "sales", "viewer"] }).notNull().default("sales"),
    invitedById: integer("invited_by_id"),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (t) => ({
    orgUserUnique: uniqueIndex("org_user_unique").on(t.organizationId, t.userId),
  }),
);

export type OrganizationMember = typeof organizationMembersTable.$inferSelect;
export type MemberRole = OrganizationMember["role"];
