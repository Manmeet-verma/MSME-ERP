import { pgTable, serial, text, integer, timestamp, jsonb, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";

export const SOCIAL_PLATFORMS = ["facebook", "instagram", "linkedin"] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export const socialAccountsTable = pgTable(
  "social_accounts",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
    platform: text("platform", { enum: SOCIAL_PLATFORMS }).notNull(),
    externalId: text("external_id").notNull(),
    accountName: text("account_name").notNull(),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"),
    expiresAt: timestamp("expires_at"),
    status: text("status", { enum: ["active", "expired", "revoked"] }).notNull().default("active"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("social_accounts_org_platform_ext_idx").on(t.organizationId, t.platform, t.externalId)],
);

export const socialPostsTable = pgTable("social_posts", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  mediaUrls: jsonb("media_urls").$type<string[]>().notNull().default([]),
  platforms: jsonb("platforms").$type<SocialPlatform[]>().notNull().default([]),
  variants: jsonb("variants").$type<Partial<Record<SocialPlatform, string>>>().notNull().default({}),
  status: text("status", { enum: ["draft", "scheduled", "publishing", "posted", "failed", "partial"] }).notNull().default("draft"),
  scheduledAt: timestamp("scheduled_at"),
  publishedAt: timestamp("published_at"),
  createdById: integer("created_by_id").references(() => usersTable.id, { onDelete: "set null" }),
  context: jsonb("context").$type<{ productId?: number; quotationId?: number; prompt?: string }>().notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const socialPostResultsTable = pgTable("social_post_results", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => socialPostsTable.id, { onDelete: "cascade" }),
  organizationId: integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  platform: text("platform", { enum: SOCIAL_PLATFORMS }).notNull(),
  status: text("status", { enum: ["pending", "posted", "failed"] }).notNull().default("pending"),
  externalId: text("external_id"),
  externalUrl: text("external_url"),
  error: text("error"),
  publishedAt: timestamp("published_at"),
  metrics: jsonb("metrics").$type<{ likes?: number; comments?: number; shares?: number; impressions?: number }>().notNull().default({}),
  metricsFetchedAt: timestamp("metrics_fetched_at"),
});

export const insertSocialAccountSchema = createInsertSchema(socialAccountsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSocialPostSchema = createInsertSchema(socialPostsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type SocialAccount = typeof socialAccountsTable.$inferSelect;
export type SocialPost = typeof socialPostsTable.$inferSelect;
export type SocialPostResult = typeof socialPostResultsTable.$inferSelect;
export type InsertSocialAccount = z.infer<typeof insertSocialAccountSchema>;
export type InsertSocialPost = z.infer<typeof insertSocialPostSchema>;
// Keep boolean import used (no-op).
export const _socialBooleanType = boolean;
