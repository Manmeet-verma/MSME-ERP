import { db, accountsTable, journalEntriesTable, journalLinesTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";

/**
 * Standard chart of accounts seeded per organisation on first access.
 * Codes follow a simple convention so reports can find well-known accounts.
 */
const SEED: Array<{ code: string; name: string; type: "asset" | "liability" | "equity" | "income" | "expense"; subtype: string }> = [
  { code: "1000", name: "Cash", type: "asset", subtype: "cash" },
  { code: "1010", name: "Bank", type: "asset", subtype: "bank" },
  { code: "1100", name: "Accounts Receivable", type: "asset", subtype: "ar" },
  { code: "1200", name: "Inventory", type: "asset", subtype: "inventory" },
  { code: "1300", name: "GST Input Credit", type: "asset", subtype: "gst_input" },
  { code: "2000", name: "Accounts Payable", type: "liability", subtype: "ap" },
  { code: "2100", name: "GST Output Payable", type: "liability", subtype: "gst_output" },
  { code: "2200", name: "Salaries Payable", type: "liability", subtype: "payroll_payable" },
  { code: "3000", name: "Owner's Equity", type: "equity", subtype: "equity" },
  { code: "4000", name: "Sales Revenue", type: "income", subtype: "sales" },
  { code: "5000", name: "Cost of Goods Sold", type: "expense", subtype: "cogs" },
  { code: "5100", name: "Salaries Expense", type: "expense", subtype: "payroll" },
  { code: "5200", name: "Rent Expense", type: "expense", subtype: "rent" },
  { code: "5300", name: "Utilities Expense", type: "expense", subtype: "utilities" },
  { code: "5400", name: "Travel Expense", type: "expense", subtype: "travel" },
  { code: "5500", name: "Office Expense", type: "expense", subtype: "office" },
  { code: "5600", name: "Marketing Expense", type: "expense", subtype: "marketing" },
  { code: "5900", name: "Other Expense", type: "expense", subtype: "other" },
];

export async function ensureChartOfAccounts(organizationId: number): Promise<void> {
  const existing = await db.select().from(accountsTable).where(eq(accountsTable.organizationId, organizationId));
  if (existing.length > 0) return;
  await db.insert(accountsTable).values(
    SEED.map((s) => ({
      organizationId,
      code: s.code,
      name: s.name,
      type: s.type,
      subtype: s.subtype,
      isSystem: true,
    })),
  );
}

export async function getAccountByCode(organizationId: number, code: string) {
  await ensureChartOfAccounts(organizationId);
  const [a] = await db
    .select()
    .from(accountsTable)
    .where(and(eq(accountsTable.organizationId, organizationId), eq(accountsTable.code, code)));
  return a ?? null;
}

export interface JournalLineInput {
  accountCode: string;
  debit?: number;
  credit?: number;
  description?: string;
}

/**
 * Post a balanced double-entry journal. Each line references an account by its
 * code (we look up the account id). Throws if debits != credits or any code is
 * missing.
 */
export async function postJournal(opts: {
  organizationId: number;
  entryDate: Date;
  memo?: string;
  sourceType?: string;
  sourceId?: number;
  lines: JournalLineInput[];
}): Promise<number> {
  await ensureChartOfAccounts(opts.organizationId);
  const totalDr = opts.lines.reduce((s, l) => s + Number(l.debit ?? 0), 0);
  const totalCr = opts.lines.reduce((s, l) => s + Number(l.credit ?? 0), 0);
  if (Math.abs(totalDr - totalCr) > 0.01) {
    throw new Error(`Unbalanced journal: dr=${totalDr} cr=${totalCr}`);
  }
  // Pre-validate ALL account codes BEFORE inserting anything, so we never
  // leave an orphaned journal entry header on failure.
  const accounts = await db
    .select()
    .from(accountsTable)
    .where(eq(accountsTable.organizationId, opts.organizationId));
  const byCode = new Map(accounts.map((a) => [a.code, a]));
  const usable = opts.lines.filter((l) => (l.debit ?? 0) !== 0 || (l.credit ?? 0) !== 0);
  for (const ln of usable) {
    if (!byCode.has(ln.accountCode)) {
      throw new Error(`Unknown account code ${ln.accountCode}`);
    }
  }
  if (usable.length === 0) {
    throw new Error("Journal has no non-zero lines");
  }
  // All inserts run inside a single transaction — partial writes are impossible.
  return await db.transaction(async (tx) => {
    const [entry] = await tx
      .insert(journalEntriesTable)
      .values({
        organizationId: opts.organizationId,
        entryDate: opts.entryDate.toISOString().slice(0, 10),
        memo: opts.memo ?? null,
        sourceType: opts.sourceType ?? null,
        sourceId: opts.sourceId ?? null,
      })
      .returning();
    for (const ln of usable) {
      const acct = byCode.get(ln.accountCode)!;
      await tx.insert(journalLinesTable).values({
        organizationId: opts.organizationId,
        entryId: entry.id,
        accountId: acct.id,
        debit: (ln.debit ?? 0).toFixed(2),
        credit: (ln.credit ?? 0).toFixed(2),
        description: ln.description ?? null,
      });
    }
    return entry.id;
  });
}

/** Delete and re-post a journal entry for a source. Safe to call repeatedly.
 *  The delete + repost runs inside a single DB transaction so the source can
 *  never be left with half-deleted prior entries on failure. */
export async function reverseAndRepost(
  organizationId: number,
  sourceType: string,
  sourceId: number,
  rebuild: () => Promise<JournalLineInput[] | null>,
  opts: { entryDate: Date; memo?: string },
): Promise<void> {
  await ensureChartOfAccounts(organizationId);
  // Compute new lines + validate BEFORE touching the DB.
  const lines = await rebuild();
  const totalDr = (lines ?? []).reduce((s, l) => s + Number(l.debit ?? 0), 0);
  const totalCr = (lines ?? []).reduce((s, l) => s + Number(l.credit ?? 0), 0);
  if (lines && Math.abs(totalDr - totalCr) > 0.01) {
    throw new Error(`Unbalanced journal: dr=${totalDr} cr=${totalCr}`);
  }
  const accounts = await db
    .select()
    .from(accountsTable)
    .where(eq(accountsTable.organizationId, organizationId));
  const byCode = new Map(accounts.map((a) => [a.code, a]));
  const usable = (lines ?? []).filter((l) => (l.debit ?? 0) !== 0 || (l.credit ?? 0) !== 0);
  for (const ln of usable) {
    if (!byCode.has(ln.accountCode)) {
      throw new Error(`Unknown account code ${ln.accountCode}`);
    }
  }
  await db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(journalEntriesTable)
      .where(
        and(
          eq(journalEntriesTable.organizationId, organizationId),
          eq(journalEntriesTable.sourceType, sourceType),
          eq(journalEntriesTable.sourceId, sourceId),
        ),
      );
    for (const e of existing) {
      await tx.delete(journalLinesTable).where(eq(journalLinesTable.entryId, e.id));
      await tx.delete(journalEntriesTable).where(eq(journalEntriesTable.id, e.id));
    }
    if (usable.length === 0) return;
    const [entry] = await tx
      .insert(journalEntriesTable)
      .values({
        organizationId,
        entryDate: opts.entryDate.toISOString().slice(0, 10),
        memo: opts.memo ?? null,
        sourceType,
        sourceId,
      })
      .returning();
    for (const ln of usable) {
      const acct = byCode.get(ln.accountCode)!;
      await tx.insert(journalLinesTable).values({
        organizationId,
        entryId: entry.id,
        accountId: acct.id,
        debit: (ln.debit ?? 0).toFixed(2),
        credit: (ln.credit ?? 0).toFixed(2),
        description: ln.description ?? null,
      });
    }
  });
}
