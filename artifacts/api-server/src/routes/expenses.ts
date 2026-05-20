import { Router } from "express";
import { db, expensesTable, expenseCategoriesTable } from "@workspace/db";
import { and, eq, desc, gte, lte } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";
import { ensureChartOfAccounts, postJournal, reverseAndRepost } from "../lib/accounting";

const expensesRouter = Router();

const DEFAULT_CATEGORIES: Array<{ name: string; accountCode: string }> = [
  { name: "Rent", accountCode: "5200" },
  { name: "Utilities", accountCode: "5300" },
  { name: "Travel", accountCode: "5400" },
  { name: "Office Supplies", accountCode: "5500" },
  { name: "Marketing", accountCode: "5600" },
  { name: "Other", accountCode: "5900" },
];

async function ensureCategories(orgId: number) {
  const existing = await db
    .select()
    .from(expenseCategoriesTable)
    .where(eq(expenseCategoriesTable.organizationId, orgId));
  if (existing.length > 0) return;
  await db.insert(expenseCategoriesTable).values(
    DEFAULT_CATEGORIES.map((c) => ({
      organizationId: orgId,
      name: c.name,
      accountCode: c.accountCode,
      isSystem: true,
    })),
  );
}

function fmt(e: typeof expensesTable.$inferSelect) {
  return {
    id: e.id,
    expenseDate: e.expenseDate,
    categoryId: e.categoryId ?? null,
    vendorName: e.vendorName ?? null,
    description: e.description ?? null,
    amount: Number(e.amount),
    gstRate: Number(e.gstRate),
    gstAmount: Number(e.gstAmount),
    total: Number(e.total),
    paymentMethod: e.paymentMethod,
    receiptUrl: e.receiptUrl ?? null,
    notes: e.notes ?? null,
    createdAt: e.createdAt.toISOString(),
  };
}

function fmtCat(c: typeof expenseCategoriesTable.$inferSelect) {
  return {
    id: c.id,
    name: c.name,
    accountCode: c.accountCode ?? null,
    isSystem: c.isSystem,
    createdAt: c.createdAt.toISOString(),
  };
}

expensesRouter.get("/expense-categories", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  await ensureCategories(orgId);
  await ensureChartOfAccounts(orgId);
  const rows = await db
    .select()
    .from(expenseCategoriesTable)
    .where(eq(expenseCategoriesTable.organizationId, orgId));
  res.json(rows.map(fmtCat));
});

expensesRouter.post("/expense-categories", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const b = req.body ?? {};
  if (!b.name) {
    res.status(400).json({ error: "name required" });
    return;
  }
  const [c] = await db
    .insert(expenseCategoriesTable)
    .values({
      organizationId: orgId,
      name: String(b.name),
      accountCode: b.accountCode ?? "5900",
      isSystem: false,
    })
    .returning();
  res.status(201).json(fmtCat(c));
});

async function postExpenseJournal(orgId: number, expenseId: number) {
  const [e] = await db
    .select()
    .from(expensesTable)
    .where(and(eq(expensesTable.id, expenseId), eq(expensesTable.organizationId, orgId)));
  if (!e) return;
  let expenseAccount = "5900";
  if (e.categoryId) {
    const [c] = await db
      .select()
      .from(expenseCategoriesTable)
      .where(eq(expenseCategoriesTable.id, e.categoryId));
    if (c?.accountCode) expenseAccount = c.accountCode;
  }
  const payAccount = e.paymentMethod === "cash" ? "1000" : "1010";
  await reverseAndRepost(
    orgId,
    "expense",
    expenseId,
    async () => {
      const lines: Array<{ accountCode: string; debit?: number; credit?: number; description?: string }> = [
        { accountCode: expenseAccount, debit: Number(e.amount), description: e.description ?? undefined },
      ];
      if (Number(e.gstAmount) > 0) {
        lines.push({ accountCode: "1300", debit: Number(e.gstAmount), description: "GST input on expense" });
      }
      lines.push({ accountCode: payAccount, credit: Number(e.total), description: `Paid via ${e.paymentMethod}` });
      return lines;
    },
    { entryDate: new Date(e.expenseDate), memo: `Expense: ${e.description ?? e.vendorName ?? ""}` },
  );
}

expensesRouter.get("/expenses", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const from = req.query.from ? String(req.query.from) : null;
  const to = req.query.to ? String(req.query.to) : null;
  const conds = [eq(expensesTable.organizationId, orgId)];
  if (from) conds.push(gte(expensesTable.expenseDate, from));
  if (to) conds.push(lte(expensesTable.expenseDate, to));
  const rows = await db
    .select()
    .from(expensesTable)
    .where(and(...conds))
    .orderBy(desc(expensesTable.expenseDate));
  res.json(rows.map(fmt));
});

expensesRouter.post("/expenses", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const b = req.body ?? {};
  if (b.amount === undefined || !b.expenseDate) {
    res.status(400).json({ error: "amount and expenseDate required" });
    return;
  }
  const amount = Number(b.amount);
  const gstRate = Number(b.gstRate ?? 0);
  const gstAmount = Number(((amount * gstRate) / 100).toFixed(2));
  const total = Number((amount + gstAmount).toFixed(2));
  const [e] = await db
    .insert(expensesTable)
    .values({
      organizationId: orgId,
      expenseDate: String(b.expenseDate),
      categoryId: b.categoryId ?? null,
      vendorName: b.vendorName ?? null,
      description: b.description ?? null,
      amount: amount.toFixed(2),
      gstRate: gstRate.toFixed(2),
      gstAmount: gstAmount.toFixed(2),
      total: total.toFixed(2),
      paymentMethod: b.paymentMethod ?? "cash",
      receiptUrl: b.receiptUrl ?? null,
      notes: b.notes ?? null,
    })
    .returning();
  await postExpenseJournal(orgId, e.id);
  await logAction(req, "CREATE", "expense", e.id, `₹${total}`);
  res.status(201).json(fmt(e));
});

expensesRouter.patch("/expenses/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  const b = req.body ?? {};
  const [existing] = await db
    .select()
    .from(expensesTable)
    .where(and(eq(expensesTable.id, id), eq(expensesTable.organizationId, orgId)));
  if (!existing) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }
  const amount = b.amount !== undefined ? Number(b.amount) : Number(existing.amount);
  const gstRate = b.gstRate !== undefined ? Number(b.gstRate) : Number(existing.gstRate);
  const gstAmount = Number(((amount * gstRate) / 100).toFixed(2));
  const total = Number((amount + gstAmount).toFixed(2));
  const updates: Record<string, unknown> = {
    amount: amount.toFixed(2),
    gstRate: gstRate.toFixed(2),
    gstAmount: gstAmount.toFixed(2),
    total: total.toFixed(2),
  };
  for (const f of ["expenseDate", "categoryId", "vendorName", "description", "paymentMethod", "receiptUrl", "notes"] as const) {
    if (b[f] !== undefined) updates[f] = b[f];
  }
  const [e] = await db
    .update(expensesTable)
    .set(updates)
    .where(eq(expensesTable.id, id))
    .returning();
  await postExpenseJournal(orgId, e.id);
  res.json(fmt(e));
});

expensesRouter.delete("/expenses/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  const result = await db
    .delete(expensesTable)
    .where(and(eq(expensesTable.id, id), eq(expensesTable.organizationId, orgId)))
    .returning();
  if (result.length === 0) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  // Reverse posting (insert no lines)
  await reverseAndRepost(orgId, "expense", id, async () => null, { entryDate: new Date() });
  res.json({ message: "Deleted" });
});

export { postExpenseJournal, postJournal };
export default expensesRouter;
