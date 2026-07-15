import { Router } from "express";
import { getDb } from "../lib/firebase";
import { requireAuth } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";
import { ensureChartOfAccounts, postJournal, reverseAndRepost } from "../lib/accounting";

const db = () => getDb();
const expensesRouter = Router();

const DEFAULT_CATEGORIES: Array<{ name: string; accountCode: string }> = [
  { name: "Rent", accountCode: "5200" },
  { name: "Utilities", accountCode: "5300" },
  { name: "Travel", accountCode: "5400" },
  { name: "Office Supplies", accountCode: "5500" },
  { name: "Marketing", accountCode: "5600" },
  { name: "Other", accountCode: "5900" },
];

async function ensureCategories(orgId: string) {
  const existing = await db().collection("expense_categories").where("organizationId", "==", orgId).get();
  if (!existing.empty) return;
  for (const c of DEFAULT_CATEGORIES) {
    await db().collection("expense_categories").add({
      organizationId: orgId,
      name: c.name,
      accountCode: c.accountCode,
      isSystem: true,
      createdAt: new Date().toISOString(),
    });
  }
}

function fmt(e: Record<string, unknown>) {
  return {
    id: e.id as string,
    expenseDate: e.expenseDate as string,
    categoryId: (e.categoryId as string) ?? null,
    vendorName: (e.vendorName as string) ?? null,
    description: (e.description as string) ?? null,
    amount: Number(e.amount ?? 0),
    gstRate: Number(e.gstRate ?? 0),
    gstAmount: Number(e.gstAmount ?? 0),
    total: Number(e.total ?? 0),
    paymentMethod: e.paymentMethod as string,
    receiptUrl: (e.receiptUrl as string) ?? null,
    notes: (e.notes as string) ?? null,
    createdAt: (e.createdAt as string) ?? new Date().toISOString(),
  };
}

function fmtCat(c: Record<string, unknown>) {
  return {
    id: c.id as string,
    name: c.name as string,
    accountCode: (c.accountCode as string) ?? null,
    isSystem: c.isSystem as boolean,
    createdAt: (c.createdAt as string) ?? new Date().toISOString(),
  };
}

expensesRouter.get("/expense-categories", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  await ensureCategories(orgId);
  await ensureChartOfAccounts(orgId as unknown as number);
  const snap = await db().collection("expense_categories").where("organizationId", "==", orgId).get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  res.json(rows.map(fmtCat));
});

expensesRouter.post("/expense-categories", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const b = req.body ?? {};
  if (!b.name) {
    res.status(400).json({ error: "name required" });
    return;
  }
  const now = new Date().toISOString();
  const docRef = await db().collection("expense_categories").add({
    organizationId: orgId,
    name: String(b.name),
    accountCode: b.accountCode ?? "5900",
    isSystem: false,
    createdAt: now,
  });
  const doc = await docRef.get();
  res.status(201).json(fmtCat({ id: doc.id, ...doc.data() }));
});

async function postExpenseJournal(orgId: string, expenseId: string) {
  const expDoc = await db().collection("expenses").doc(expenseId).get();
  if (!expDoc.exists || expDoc.data()?.organizationId !== orgId) return;
  const e = expDoc.data()!;
  let expenseAccount = "5900";
  if (e.categoryId) {
    const catDoc = await db().collection("expense_categories").doc(e.categoryId as string).get();
    if (catDoc.exists && catDoc.data()?.accountCode) expenseAccount = catDoc.data()!.accountCode as string;
  }
  const payAccount = e.paymentMethod === "cash" ? "1000" : "1010";
  await reverseAndRepost(
    orgId as unknown as number,
    "expense",
    expenseId as unknown as number,
    async () => {
      const lines: Array<{ accountCode: string; debit?: number; credit?: number; description?: string }> = [
        { accountCode: expenseAccount, debit: Number(e.amount ?? 0), description: (e.description as string) ?? undefined },
      ];
      if (Number(e.gstAmount ?? 0) > 0) {
        lines.push({ accountCode: "1300", debit: Number(e.gstAmount ?? 0), description: "GST input on expense" });
      }
      lines.push({ accountCode: payAccount, credit: Number(e.total ?? 0), description: `Paid via ${e.paymentMethod}` });
      return lines;
    },
    { entryDate: new Date(e.expenseDate as string), memo: `Expense: ${e.description ?? e.vendorName ?? ""}` },
  );
}

expensesRouter.get("/expenses", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const from = req.query.from ? String(req.query.from) : null;
  const to = req.query.to ? String(req.query.to) : null;

  let query: FirebaseFirestore.Query = db().collection("expenses").where("organizationId", "==", orgId);
  if (from) query = query.where("expenseDate", ">=", from);
  if (to) query = query.where("expenseDate", "<=", to);

  const snap = await query.orderBy("expenseDate", "desc").get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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
  const now = new Date().toISOString();
  const docRef = await db().collection("expenses").add({
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
    createdAt: now,
  });
  await postExpenseJournal(orgId, docRef.id);
  await logAction(req, "CREATE", "expense", docRef.id, `₹${total}`);
  const doc = await docRef.get();
  res.status(201).json(fmt({ id: doc.id, ...doc.data() }));
});

expensesRouter.patch("/expenses/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = req.params.id;
  const b = req.body ?? {};

  const existingDoc = await db().collection("expenses").doc(id).get();
  if (!existingDoc.exists || existingDoc.data()?.organizationId !== orgId) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }
  const existing = existingDoc.data()!;
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
  await db().collection("expenses").doc(id).update(updates);
  await postExpenseJournal(orgId, id);
  const updatedDoc = await db().collection("expenses").doc(id).get();
  res.json(fmt({ id: updatedDoc.id, ...updatedDoc.data()! }));
});

expensesRouter.delete("/expenses/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = req.params.id;
  const doc = await db().collection("expenses").doc(id).get();
  if (!doc.exists || doc.data()?.organizationId !== orgId) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await db().collection("expenses").doc(id).delete();
  await reverseAndRepost(orgId as unknown as number, "expense", id as unknown as number, async () => null, { entryDate: new Date() });
  res.json({ message: "Deleted" });
});

export { postExpenseJournal, postJournal };
export default expensesRouter;
