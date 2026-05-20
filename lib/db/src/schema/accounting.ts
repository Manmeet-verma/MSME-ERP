import { pgTable, serial, text, integer, numeric, boolean, timestamp, date, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";

export const accountsTable = pgTable(
  "accounts",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    // Standard accounting categories
    type: text("type", { enum: ["asset", "liability", "equity", "income", "expense"] }).notNull(),
    // Sub-classification for reporting (cash, bank, ar, ap, sales, cogs, tax, payroll, etc.)
    subtype: text("subtype"),
    isSystem: boolean("is_system").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("accounts_org_code_idx").on(t.organizationId, t.code)],
);

export const journalEntriesTable = pgTable("journal_entries", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  entryDate: date("entry_date").notNull(),
  memo: text("memo"),
  // Polymorphic link to the originating document (invoice, payment, bill, expense, payroll_run, manual)
  sourceType: text("source_type"),
  sourceId: integer("source_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const journalLinesTable = pgTable("journal_lines", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  entryId: integer("entry_id").notNull().references(() => journalEntriesTable.id, { onDelete: "cascade" }),
  accountId: integer("account_id").notNull().references(() => accountsTable.id, { onDelete: "restrict" }),
  debit: numeric("debit", { precision: 14, scale: 2 }).notNull().default("0"),
  credit: numeric("credit", { precision: 14, scale: 2 }).notNull().default("0"),
  description: text("description"),
});

export const expenseCategoriesTable = pgTable("expense_categories", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  accountCode: text("account_code"),
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const expensesTable = pgTable("expenses", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  expenseDate: date("expense_date").notNull(),
  categoryId: integer("category_id").references(() => expenseCategoriesTable.id, { onDelete: "set null" }),
  vendorName: text("vendor_name"),
  description: text("description"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  gstRate: numeric("gst_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  gstAmount: numeric("gst_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: text("payment_method", { enum: ["cash", "bank", "upi", "card", "cheque", "other"] }).notNull().default("cash"),
  receiptUrl: text("receipt_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAccountSchema = createInsertSchema(accountsTable).omit({ id: true, createdAt: true });
export const insertJournalEntrySchema = createInsertSchema(journalEntriesTable).omit({ id: true, createdAt: true });
export const insertJournalLineSchema = createInsertSchema(journalLinesTable).omit({ id: true });
export const insertExpenseCategorySchema = createInsertSchema(expenseCategoriesTable).omit({ id: true, createdAt: true });
export const insertExpenseSchema = createInsertSchema(expensesTable).omit({ id: true, createdAt: true });

export type Account = typeof accountsTable.$inferSelect;
export type JournalEntry = typeof journalEntriesTable.$inferSelect;
export type JournalLine = typeof journalLinesTable.$inferSelect;
export type ExpenseCategory = typeof expenseCategoriesTable.$inferSelect;
export type Expense = typeof expensesTable.$inferSelect;
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
