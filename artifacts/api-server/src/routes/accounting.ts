import { Router } from "express";
import {
  db,
  accountsTable,
  journalEntriesTable,
  journalLinesTable,
  invoicesTable,
  paymentsTable,
  vendorBillsTable,
  expensesTable,
  clientsTable,
  vendorsTable,
} from "@workspace/db";
import { and, eq, desc, gte, lte, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { ensureChartOfAccounts, postJournal } from "../lib/accounting";
import ExcelJS from "exceljs";
import type { Response } from "express";

const accountingRouter = Router();

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}

async function sendXlsx(res: Response, name: string, sheets: Array<{ name: string; rows: Array<Record<string, unknown>> }>) {
  const wb = new ExcelJS.Workbook();
  for (const s of sheets) {
    const ws = wb.addWorksheet(s.name.slice(0, 31));
    if (s.rows.length > 0) {
      const headers = Object.keys(s.rows[0]);
      ws.columns = headers.map((h) => ({ header: h, key: h, width: Math.max(12, Math.min(40, h.length + 4)) }));
      ws.getRow(1).font = { bold: true };
      for (const r of s.rows) ws.addRow(r);
    } else {
      ws.addRow(["(no data)"]);
    }
  }
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${name}.xlsx"`);
  const buf = await wb.xlsx.writeBuffer();
  res.end(Buffer.from(buf as ArrayBuffer));
}

// ── Accounts (Chart of Accounts) ──────────────────────────────────────────
accountingRouter.get("/accounts", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  await ensureChartOfAccounts(orgId);
  const rows = await db
    .select()
    .from(accountsTable)
    .where(eq(accountsTable.organizationId, orgId))
    .orderBy(accountsTable.code);
  res.json(
    rows.map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      type: a.type,
      subtype: a.subtype ?? null,
      isSystem: a.isSystem,
      isActive: a.isActive,
      createdAt: a.createdAt.toISOString(),
    })),
  );
});

accountingRouter.post("/accounts", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  await ensureChartOfAccounts(orgId);
  const b = req.body ?? {};
  if (!b.code || !b.name || !b.type) {
    res.status(400).json({ error: "code, name, type required" });
    return;
  }
  const [a] = await db
    .insert(accountsTable)
    .values({
      organizationId: orgId,
      code: String(b.code),
      name: String(b.name),
      type: b.type,
      subtype: b.subtype ?? null,
      isSystem: false,
    })
    .returning();
  res.status(201).json(a);
});

// ── Journal entries (manual + listing) ────────────────────────────────────
accountingRouter.get("/journal-entries", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const from = req.query.from ? String(req.query.from) : null;
  const to = req.query.to ? String(req.query.to) : null;
  const conds = [eq(journalEntriesTable.organizationId, orgId)];
  if (from) conds.push(gte(journalEntriesTable.entryDate, from));
  if (to) conds.push(lte(journalEntriesTable.entryDate, to));
  const entries = await db
    .select()
    .from(journalEntriesTable)
    .where(and(...conds))
    .orderBy(desc(journalEntriesTable.entryDate), desc(journalEntriesTable.id));
  const ids = entries.map((e) => e.id);
  const lines = ids.length
    ? await db.select().from(journalLinesTable).where(eq(journalLinesTable.organizationId, orgId))
    : [];
  const accounts = await db.select().from(accountsTable).where(eq(accountsTable.organizationId, orgId));
  const amap = new Map(accounts.map((a) => [a.id, a]));
  const byEntry = new Map<number, typeof lines>();
  for (const l of lines) {
    if (!ids.includes(l.entryId)) continue;
    const arr = byEntry.get(l.entryId) ?? [];
    arr.push(l);
    byEntry.set(l.entryId, arr);
  }
  res.json(
    entries.map((e) => ({
      id: e.id,
      entryDate: e.entryDate,
      memo: e.memo ?? null,
      sourceType: e.sourceType ?? null,
      sourceId: e.sourceId ?? null,
      createdAt: e.createdAt.toISOString(),
      lines: (byEntry.get(e.id) ?? []).map((l) => ({
        id: l.id,
        accountId: l.accountId,
        accountCode: amap.get(l.accountId)?.code ?? "",
        accountName: amap.get(l.accountId)?.name ?? "",
        debit: Number(l.debit),
        credit: Number(l.credit),
        description: l.description ?? null,
      })),
    })),
  );
});

accountingRouter.post("/journal-entries", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const b = req.body ?? {};
  if (!b.entryDate || !Array.isArray(b.lines)) {
    res.status(400).json({ error: "entryDate and lines required" });
    return;
  }
  try {
    const id = await postJournal({
      organizationId: orgId,
      entryDate: new Date(b.entryDate),
      memo: b.memo ?? null,
      sourceType: "manual",
      lines: b.lines.map((l: { accountCode: string; debit?: number; credit?: number; description?: string }) => ({
        accountCode: l.accountCode,
        debit: l.debit,
        credit: l.credit,
        description: l.description,
      })),
    });
    res.status(201).json({ id });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// ── Ledger view (per account) ─────────────────────────────────────────────
accountingRouter.get("/accounting/ledger", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const accountId = req.query.accountId ? Number(req.query.accountId) : null;
  const from = req.query.from ? String(req.query.from) : null;
  const to = req.query.to ? String(req.query.to) : null;
  if (!accountId) {
    res.status(400).json({ error: "accountId required" });
    return;
  }
  const [acct] = await db
    .select()
    .from(accountsTable)
    .where(and(eq(accountsTable.id, accountId), eq(accountsTable.organizationId, orgId)));
  if (!acct) {
    res.status(404).json({ error: "Account not found" });
    return;
  }
  // Join lines to entries
  const conds = [
    eq(journalLinesTable.organizationId, orgId),
    eq(journalLinesTable.accountId, accountId),
  ];
  const rows = await db
    .select({
      lineId: journalLinesTable.id,
      entryId: journalLinesTable.entryId,
      debit: journalLinesTable.debit,
      credit: journalLinesTable.credit,
      description: journalLinesTable.description,
      entryDate: journalEntriesTable.entryDate,
      memo: journalEntriesTable.memo,
      sourceType: journalEntriesTable.sourceType,
      sourceId: journalEntriesTable.sourceId,
    })
    .from(journalLinesTable)
    .innerJoin(journalEntriesTable, eq(journalLinesTable.entryId, journalEntriesTable.id))
    .where(and(...conds))
    .orderBy(journalEntriesTable.entryDate, journalLinesTable.id);
  const filtered = rows.filter((r) => (!from || r.entryDate >= from) && (!to || r.entryDate <= to));
  // Running balance (asset/expense: dr-cr; liability/equity/income: cr-dr)
  const sign = acct.type === "asset" || acct.type === "expense" ? 1 : -1;
  let running = 0;
  const lines = filtered.map((r) => {
    running += sign * (Number(r.debit) - Number(r.credit));
    return {
      lineId: r.lineId,
      entryId: r.entryId,
      entryDate: r.entryDate,
      memo: r.memo ?? null,
      sourceType: r.sourceType ?? null,
      sourceId: r.sourceId ?? null,
      description: r.description ?? null,
      debit: Number(r.debit),
      credit: Number(r.credit),
      balance: Number(running.toFixed(2)),
    };
  });
  res.json({
    account: { id: acct.id, code: acct.code, name: acct.name, type: acct.type },
    lines,
    closingBalance: Number(running.toFixed(2)),
  });
});

// ── P&L statement ─────────────────────────────────────────────────────────
async function pnlForRange(orgId: number, from: string, to: string) {
  const rows = await db
    .select({
      accountId: journalLinesTable.accountId,
      debit: sql<string>`coalesce(sum(${journalLinesTable.debit}),0)::text`,
      credit: sql<string>`coalesce(sum(${journalLinesTable.credit}),0)::text`,
    })
    .from(journalLinesTable)
    .innerJoin(journalEntriesTable, eq(journalLinesTable.entryId, journalEntriesTable.id))
    .where(
      and(
        eq(journalLinesTable.organizationId, orgId),
        gte(journalEntriesTable.entryDate, from),
        lte(journalEntriesTable.entryDate, to),
      ),
    )
    .groupBy(journalLinesTable.accountId);
  const accounts = await db.select().from(accountsTable).where(eq(accountsTable.organizationId, orgId));
  const amap = new Map(accounts.map((a) => [a.id, a]));
  const income: Array<{ code: string; name: string; amount: number }> = [];
  const expense: Array<{ code: string; name: string; amount: number }> = [];
  for (const r of rows) {
    const a = amap.get(r.accountId);
    if (!a) continue;
    const amt = Number(r.credit) - Number(r.debit);
    if (a.type === "income") income.push({ code: a.code, name: a.name, amount: Number(amt.toFixed(2)) });
    else if (a.type === "expense") expense.push({ code: a.code, name: a.name, amount: Number((-amt).toFixed(2)) });
  }
  const totalIncome = income.reduce((s, x) => s + x.amount, 0);
  const totalExpense = expense.reduce((s, x) => s + x.amount, 0);
  return {
    from,
    to,
    income,
    expense,
    totalIncome: Number(totalIncome.toFixed(2)),
    totalExpense: Number(totalExpense.toFixed(2)),
    netProfit: Number((totalIncome - totalExpense).toFixed(2)),
  };
}

accountingRouter.get("/accounting/pnl", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const defaultTo = now.toISOString().slice(0, 10);
  const from = String(req.query.from ?? defaultFrom);
  const to = String(req.query.to ?? defaultTo);
  const current = await pnlForRange(orgId, from, to);
  let previous: Awaited<ReturnType<typeof pnlForRange>> | null = null;
  if (req.query.compare === "true") {
    const ms = new Date(to).getTime() - new Date(from).getTime();
    const prevTo = new Date(new Date(from).getTime() - 86400000).toISOString().slice(0, 10);
    const prevFrom = new Date(new Date(from).getTime() - 86400000 - ms).toISOString().slice(0, 10);
    previous = await pnlForRange(orgId, prevFrom, prevTo);
  }
  res.json({ current, previous });
});

// ── GST reports ───────────────────────────────────────────────────────────
async function gstr1Data(orgId: number, from: string, to: string) {
  const invs = await db
    .select()
    .from(invoicesTable)
    .where(
      and(
        eq(invoicesTable.organizationId, orgId),
        gte(invoicesTable.issueDate, new Date(from)),
        lte(invoicesTable.issueDate, new Date(to + "T23:59:59")),
        sql`${invoicesTable.status} <> 'cancelled' and ${invoicesTable.status} <> 'draft'`,
      ),
    );
  const clients = await db.select().from(clientsTable).where(eq(clientsTable.organizationId, orgId));
  const cmap = new Map(clients.map((c) => [c.id, c]));
  const b2b: Array<Record<string, unknown>> = [];
  const b2c: Array<Record<string, unknown>> = [];
  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  for (const inv of invs) {
    const c = inv.clientId ? cmap.get(inv.clientId) : null;
    const row = {
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.issueDate.toISOString().slice(0, 10),
      clientName: c?.name ?? "",
      gstin: c?.gstNumber ?? "",
      placeOfSupply: inv.buyerState ?? "",
      taxableValue: Number(inv.taxableAmount),
      rate: Number(inv.taxRate),
      cgst: Number(inv.cgst),
      sgst: Number(inv.sgst),
      igst: Number(inv.igst),
      invoiceTotal: Number(inv.total),
    };
    totalTaxable += row.taxableValue;
    totalCgst += row.cgst;
    totalSgst += row.sgst;
    totalIgst += row.igst;
    if (c?.gstNumber) b2b.push(row);
    else b2c.push(row);
  }
  return {
    from,
    to,
    b2b,
    b2c,
    summary: {
      invoices: invs.length,
      taxableValue: Number(totalTaxable.toFixed(2)),
      cgst: Number(totalCgst.toFixed(2)),
      sgst: Number(totalSgst.toFixed(2)),
      igst: Number(totalIgst.toFixed(2)),
      totalTax: Number((totalCgst + totalSgst + totalIgst).toFixed(2)),
    },
  };
}

accountingRouter.get("/accounting/gstr1", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const defaultTo = now.toISOString().slice(0, 10);
  const from = String(req.query.from ?? defaultFrom);
  const to = String(req.query.to ?? defaultTo);
  const data = await gstr1Data(orgId, from, to);
  const format = String(req.query.format ?? "json");
  if (format === "csv") {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="gstr1-${from}_${to}.csv"`);
    const csv = [
      "# GSTR-1 Summary",
      `Period,${from},to,${to}`,
      `Invoices,${data.summary.invoices}`,
      `Taxable,${data.summary.taxableValue}`,
      `CGST,${data.summary.cgst}`,
      `SGST,${data.summary.sgst}`,
      `IGST,${data.summary.igst}`,
      "",
      "# B2B",
      toCsv(data.b2b),
      "",
      "# B2C",
      toCsv(data.b2c),
    ].join("\n");
    res.send(csv);
    return;
  }
  if (format === "xlsx") {
    void sendXlsx(res, `gstr1-${from}_${to}`, [
      { name: "Summary", rows: [data.summary] },
      { name: "B2B", rows: data.b2b },
      { name: "B2C", rows: data.b2c },
    ]);
    return;
  }
  res.json(data);
});

accountingRouter.get("/accounting/gstr3b", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const defaultTo = now.toISOString().slice(0, 10);
  const from = String(req.query.from ?? defaultFrom);
  const to = String(req.query.to ?? defaultTo);
  // 3.1 (a) Outward taxable supplies (other than zero-rated etc.)
  const outward = await gstr1Data(orgId, from, to);
  // 4. Eligible ITC (inputs from expenses + vendor bills)
  const exps = await db
    .select()
    .from(expensesTable)
    .where(
      and(
        eq(expensesTable.organizationId, orgId),
        gte(expensesTable.expenseDate, from),
        lte(expensesTable.expenseDate, to),
      ),
    );
  const expInputGst = exps.reduce((s, e) => s + Number(e.gstAmount), 0);
  const bills = await db
    .select()
    .from(vendorBillsTable)
    .where(
      and(
        eq(vendorBillsTable.organizationId, orgId),
        gte(vendorBillsTable.issueDate, new Date(from)),
        lte(vendorBillsTable.issueDate, new Date(to + "T23:59:59")),
        sql`${vendorBillsTable.status} <> 'cancelled' and ${vendorBillsTable.status} <> 'draft'`,
      ),
    );
  const billInputGst = bills.reduce((s, b) => s + Number(b.taxAmount), 0);
  const totalItc = Number((expInputGst + billInputGst).toFixed(2));
  const netTaxPayable = Number(((outward.summary.cgst + outward.summary.sgst + outward.summary.igst) - totalItc).toFixed(2));
  const data = {
    from,
    to,
    outwardSupplies: {
      taxable: outward.summary.taxableValue,
      cgst: outward.summary.cgst,
      sgst: outward.summary.sgst,
      igst: outward.summary.igst,
    },
    itc: {
      cgstSgstInputs: Number((expInputGst + billInputGst).toFixed(2)),
      igstInputs: 0,
      total: totalItc,
    },
    netTaxPayable,
  };
  const format = String(req.query.format ?? "json");
  if (format === "csv") {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="gstr3b-${from}_${to}.csv"`);
    const csv = [
      "# GSTR-3B Summary",
      `Period,${from},to,${to}`,
      `Outward taxable,${data.outwardSupplies.taxable}`,
      `Outward CGST,${data.outwardSupplies.cgst}`,
      `Outward SGST,${data.outwardSupplies.sgst}`,
      `Outward IGST,${data.outwardSupplies.igst}`,
      `ITC total,${data.itc.total}`,
      `Net tax payable,${data.netTaxPayable}`,
    ].join("\n");
    res.send(csv);
    return;
  }
  if (format === "xlsx") {
    void sendXlsx(res, `gstr3b-${from}_${to}`, [{ name: "GSTR-3B", rows: [data.outwardSupplies, data.itc, { netTaxPayable: data.netTaxPayable }] }]);
    return;
  }
  res.json(data);
});

// ── Vendor ageing ─────────────────────────────────────────────────────────
accountingRouter.get("/accounting/vendor-ageing", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const bills = await db
    .select()
    .from(vendorBillsTable)
    .where(and(eq(vendorBillsTable.organizationId, orgId), sql`${vendorBillsTable.status} not in ('paid','cancelled','draft')`));
  const vrows = await db.select().from(vendorsTable).where(eq(vendorsTable.organizationId, orgId));
  const vmap = new Map(vrows.map((v) => [v.id, v]));
  const now = Date.now();
  const buckets = new Map<number, { vendorId: number; vendorName: string; current: number; days30: number; days60: number; days90: number; daysOver90: number; total: number }>();
  for (const b of bills) {
    const bal = Number(b.total) - Number(b.amountPaid);
    if (bal <= 0) continue;
    const vid = b.vendorId ?? 0;
    const vname = vmap.get(vid)?.name ?? "Unknown";
    const ref = b.dueDate?.getTime() ?? b.issueDate.getTime();
    const age = Math.max(0, Math.floor((now - ref) / 86400000));
    const k = buckets.get(vid) ?? { vendorId: vid, vendorName: vname, current: 0, days30: 0, days60: 0, days90: 0, daysOver90: 0, total: 0 };
    if (age <= 0) k.current += bal;
    else if (age <= 30) k.days30 += bal;
    else if (age <= 60) k.days60 += bal;
    else if (age <= 90) k.days90 += bal;
    else k.daysOver90 += bal;
    k.total += bal;
    buckets.set(vid, k);
  }
  res.json([...buckets.values()].sort((a, b) => b.total - a.total));
});

// Mark unused imports to silence TS noise
void paymentsTable;

export default accountingRouter;
