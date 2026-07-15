import { Router } from "express";
import { getDb } from "../lib/firebase";
import { requireAuth } from "../middlewares/auth";
import { ensureChartOfAccounts, postJournal } from "../lib/accounting";
import ExcelJS from "exceljs";
import type { Response } from "express";

const db = () => getDb();
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
  await ensureChartOfAccounts(orgId as unknown as number);
  const snap = await db().collection("accounts").where("organizationId", "==", orgId).orderBy("code").get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  res.json(
    rows.map((a) => ({
      id: a.id as string,
      code: a.code as string,
      name: a.name as string,
      type: a.type as string,
      subtype: (a.subtype as string) ?? null,
      isSystem: a.isSystem as boolean,
      isActive: a.isActive as boolean,
      createdAt: (a.createdAt as string) ?? new Date().toISOString(),
    })),
  );
});

accountingRouter.post("/accounts", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  await ensureChartOfAccounts(orgId as unknown as number);
  const b = req.body ?? {};
  if (!b.code || !b.name || !b.type) {
    res.status(400).json({ error: "code, name, type required" });
    return;
  }
  const now = new Date().toISOString();
  const docRef = await db().collection("accounts").add({
    organizationId: orgId,
    code: String(b.code),
    name: String(b.name),
    type: b.type,
    subtype: b.subtype ?? null,
    isSystem: false,
    isActive: true,
    createdAt: now,
  });
  const doc = await docRef.get();
  res.status(201).json({ id: doc.id, ...doc.data() });
});

// ── Journal entries (manual + listing) ────────────────────────────────────
accountingRouter.get("/journal-entries", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const from = req.query.from ? String(req.query.from) : null;
  const to = req.query.to ? String(req.query.to) : null;

  let query: FirebaseFirestore.Query = db().collection("journal_entries").where("organizationId", "==", orgId);
  if (from) query = query.where("entryDate", ">=", from);
  if (to) query = query.where("entryDate", "<=", to);

  const entriesSnap = await query.orderBy("entryDate", "desc").get();
  const entries = entriesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const linesSnap = await db().collection("journal_lines").where("organizationId", "==", orgId).get();
  const accountsSnap = await db().collection("accounts").where("organizationId", "==", orgId).get();
  const amap = new Map(accountsSnap.docs.map((d) => [d.id, d.data()]));

  const entryIds = new Set(entries.map((e) => e.id));
  const byEntry = new Map<string, Array<Record<string, unknown>>>();
  for (const lDoc of linesSnap.docs) {
    const l = lDoc.data();
    const entryId = l.entryId as string;
    if (!entryIds.has(entryId)) continue;
    const arr = byEntry.get(entryId) ?? [];
    arr.push({ id: lDoc.id, ...l });
    byEntry.set(entryId, arr);
  }

  res.json(
    entries.map((e) => ({
      id: e.id as string,
      entryDate: e.entryDate as string,
      memo: (e.memo as string) ?? null,
      sourceType: (e.sourceType as string) ?? null,
      sourceId: (e.sourceId as string) ?? null,
      createdAt: (e.createdAt as string) ?? new Date().toISOString(),
      lines: (byEntry.get(e.id as string) ?? []).map((l) => ({
        id: l.id as string,
        accountId: l.accountId as string,
        accountCode: amap.get(l.accountId as string)?.code ?? "",
        accountName: amap.get(l.accountId as string)?.name ?? "",
        debit: Number(l.debit ?? 0),
        credit: Number(l.credit ?? 0),
        description: (l.description as string) ?? null,
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
      organizationId: orgId as unknown as number,
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
  const accountId = req.query.accountId ? String(req.query.accountId) : null;
  const from = req.query.from ? String(req.query.from) : null;
  const to = req.query.to ? String(req.query.to) : null;
  if (!accountId) {
    res.status(400).json({ error: "accountId required" });
    return;
  }
  const acctDoc = await db().collection("accounts").doc(accountId).get();
  if (!acctDoc.exists || acctDoc.data()?.organizationId !== orgId) {
    res.status(404).json({ error: "Account not found" });
    return;
  }
  const acct = acctDoc.data()!;

  const linesSnap = await db().collection("journal_lines")
    .where("organizationId", "==", orgId)
    .where("accountId", "==", accountId)
    .get();

  const entryIds = linesSnap.docs.map((d) => d.data().entryId as string);
  const entriesSnap = entryIds.length > 0
    ? await db().collection("journal_entries").where("entryId", "in", entryIds).get()
    : { docs: [] as FirebaseFirestore.QueryDocumentSnapshot[] };

  // Build entry map - Firestore doesn't support `in` with >10 values, so fetch individually if needed
  const entryMap = new Map<string, Record<string, unknown>>();
  // If we have many entries, fetch them in batches
  const uniqueEntryIds = [...new Set(entryIds)];
  for (let i = 0; i < uniqueEntryIds.length; i += 10) {
    const batch = uniqueEntryIds.slice(i, i + 10);
    const batchSnap = await db().collection("journal_entries").where("entryId", "in", batch).get();
    for (const d of batchSnap.docs) {
      entryMap.set(d.id, d.data());
    }
  }
  // Fallback: fetch individual entries if not found in batch
  for (const entryId of uniqueEntryIds) {
    if (!entryMap.has(entryId)) {
      const entryDoc = await db().collection("journal_entries").doc(entryId).get();
      if (entryDoc.exists) entryMap.set(entryId, entryDoc.data()!);
    }
  }

  const rawLines = linesSnap.docs.map((lDoc) => {
    const l = lDoc.data();
    const entry = entryMap.get(l.entryId as string) ?? {};
    return {
      lineId: lDoc.id,
      entryId: l.entryId,
      debit: l.debit,
      credit: l.credit,
      description: l.description,
      entryDate: entry.entryDate ?? "",
      memo: entry.memo ?? null,
      sourceType: entry.sourceType ?? null,
      sourceId: entry.sourceId ?? null,
    };
  });

  const filtered = rawLines.filter((r) => (!from || (r.entryDate as string) >= from) && (!to || (r.entryDate as string) <= to));
  const sign = acct.type === "asset" || acct.type === "expense" ? 1 : -1;
  let running = 0;
  const lines = filtered.map((r) => {
    running += sign * (Number(r.debit ?? 0) - Number(r.credit ?? 0));
    return {
      lineId: r.lineId,
      entryId: r.entryId,
      entryDate: r.entryDate,
      memo: r.memo ?? null,
      sourceType: r.sourceType ?? null,
      sourceId: r.sourceId ?? null,
      description: r.description ?? null,
      debit: Number(r.debit ?? 0),
      credit: Number(r.credit ?? 0),
      balance: Number(running.toFixed(2)),
    };
  });
  res.json({
    account: { id: accountId, code: acct.code, name: acct.name, type: acct.type },
    lines,
    closingBalance: Number(running.toFixed(2)),
  });
});

// ── P&L statement ─────────────────────────────────────────────────────────
async function pnlForRange(orgId: string, from: string, to: string) {
  // Get all journal lines for this org
  const linesSnap = await db().collection("journal_lines").where("organizationId", "==", orgId).get();
  const entryIds = [...new Set(linesSnap.docs.map((d) => d.data().entryId as string))];

  // Fetch entries in batches
  const entryMap = new Map<string, Record<string, unknown>>();
  for (let i = 0; i < entryIds.length; i += 10) {
    const batch = entryIds.slice(i, i + 10);
    const batchSnap = await db().collection("journal_entries").where("entryId", "in", batch).get();
    for (const d of batchSnap.docs) entryMap.set(d.id, d.data());
  }
  for (const eid of entryIds) {
    if (!entryMap.has(eid)) {
      const ed = await db().collection("journal_entries").doc(eid).get();
      if (ed.exists) entryMap.set(eid, ed.data()!);
    }
  }

  // Filter by date range and aggregate by accountId
  const accountsSnap = await db().collection("accounts").where("organizationId", "==", orgId).get();
  const amap = new Map(accountsSnap.docs.map((d) => [d.id, d.data()]));
  const aggMap = new Map<string, { debit: number; credit: number }>();

  for (const lDoc of linesSnap.docs) {
    const l = lDoc.data();
    const entry = entryMap.get(l.entryId as string);
    if (!entry) continue;
    const entryDate = entry.entryDate as string;
    if (entryDate < from || entryDate > to) continue;
    const accId = l.accountId as string;
    const existing = aggMap.get(accId) ?? { debit: 0, credit: 0 };
    existing.debit += Number(l.debit ?? 0);
    existing.credit += Number(l.credit ?? 0);
    aggMap.set(accId, existing);
  }

  const income: Array<{ code: string; name: string; amount: number }> = [];
  const expense: Array<{ code: string; name: string; amount: number }> = [];
  for (const [accId, agg] of aggMap) {
    const a = amap.get(accId);
    if (!a) continue;
    const amt = agg.credit - agg.debit;
    if (a.type === "income") income.push({ code: a.code as string, name: a.name as string, amount: Number(amt.toFixed(2)) });
    else if (a.type === "expense") expense.push({ code: a.code as string, name: a.name as string, amount: Number((-amt).toFixed(2)) });
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
async function gstr1Data(orgId: string, from: string, to: string) {
  const invSnap = await db().collection("invoices")
    .where("organizationId", "==", orgId)
    .where("issueDate", ">=", new Date(from))
    .where("issueDate", "<=", new Date(to + "T23:59:59"))
    .get();
  const invs = invSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((inv) => inv.status !== "cancelled" && inv.status !== "draft");

  const clientsSnap = await db().collection("clients").where("organizationId", "==", orgId).get();
  const cmap = new Map(clientsSnap.docs.map((c) => [c.id, c.data()]));

  const b2b: Array<Record<string, unknown>> = [];
  const b2c: Array<Record<string, unknown>> = [];
  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  for (const inv of invs) {
    const c = inv.clientId ? cmap.get(inv.clientId as string) : null;
    const row = {
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.issueDate instanceof Date ? inv.issueDate.toISOString().slice(0, 10) : String(inv.issueDate).slice(0, 10),
      clientName: c?.name ?? "",
      gstin: c?.gstNumber ?? "",
      placeOfSupply: inv.buyerState ?? "",
      taxableValue: Number(inv.taxableAmount ?? 0),
      rate: Number(inv.taxRate ?? 0),
      cgst: Number(inv.cgst ?? 0),
      sgst: Number(inv.sgst ?? 0),
      igst: Number(inv.igst ?? 0),
      invoiceTotal: Number(inv.total ?? 0),
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

  const outward = await gstr1Data(orgId, from, to);

  const expSnap = await db().collection("expenses")
    .where("organizationId", "==", orgId)
    .where("expenseDate", ">=", from)
    .where("expenseDate", "<=", to)
    .get();
  const expInputGst = expSnap.docs.reduce((s, e) => s + Number(e.data().gstAmount ?? 0), 0);

  const billsSnap = await db().collection("vendor_bills")
    .where("organizationId", "==", orgId)
    .where("issueDate", ">=", new Date(from))
    .where("issueDate", "<=", new Date(to + "T23:59:59"))
    .get();
  const activeBills = billsSnap.docs.filter((bDoc) => {
    const status = bDoc.data().status as string;
    return status !== "cancelled" && status !== "draft";
  });
  const billInputGst = activeBills.reduce((s, bDoc) => s + Number(bDoc.data().taxAmount ?? 0), 0);

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

// ── Balance sheet ─────────────────────────────────────────────────────────
function fiscalYearStart(asOf: string): string {
  const d = new Date(asOf);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const startYear = m >= 3 ? y : y - 1;
  return `${startYear}-04-01`;
}

async function balanceSheetData(orgId: string, asOf: string) {
  await ensureChartOfAccounts(orgId as unknown as number);
  const fyStart = fiscalYearStart(asOf);

  // Get all journal lines and entries for aggregation
  const linesSnap = await db().collection("journal_lines").where("organizationId", "==", orgId).get();
  const entryIds = [...new Set(linesSnap.docs.map((d) => d.data().entryId as string))];
  const entryMap = new Map<string, Record<string, unknown>>();
  for (let i = 0; i < entryIds.length; i += 10) {
    const batch = entryIds.slice(i, i + 10);
    const batchSnap = await db().collection("journal_entries").where("entryId", "in", batch).get();
    for (const d of batchSnap.docs) entryMap.set(d.id, d.data());
  }
  for (const eid of entryIds) {
    if (!entryMap.has(eid)) {
      const ed = await db().collection("journal_entries").doc(eid).get();
      if (ed.exists) entryMap.set(eid, ed.data()!);
    }
  }

  const accountsSnap = await db().collection("accounts").where("organizationId", "==", orgId).get();
  const amap = new Map(accountsSnap.docs.map((d) => [d.id, d.data()]));

  // Aggregate all lines up to asOf
  const allRows = new Map<string, { debit: number; credit: number }>();
  const priorRows = new Map<string, { debit: number; credit: number }>();

  for (const lDoc of linesSnap.docs) {
    const l = lDoc.data();
    const entry = entryMap.get(l.entryId as string);
    if (!entry) continue;
    const entryDate = entry.entryDate as string;
    const accId = l.accountId as string;
    const dr = Number(l.debit ?? 0);
    const cr = Number(l.credit ?? 0);

    if (entryDate <= asOf) {
      const agg = allRows.get(accId) ?? { debit: 0, credit: 0 };
      agg.debit += dr;
      agg.credit += cr;
      allRows.set(accId, agg);
    }
    if (entryDate < fyStart) {
      const agg = priorRows.get(accId) ?? { debit: 0, credit: 0 };
      agg.debit += dr;
      agg.credit += cr;
      priorRows.set(accId, agg);
    }
  }

  const assets: Array<{ code: string; name: string; amount: number }> = [];
  const liabilities: Array<{ code: string; name: string; amount: number }> = [];
  const equity: Array<{ code: string; name: string; amount: number }> = [];

  let pyIncome = 0;
  let pyExpense = 0;
  let totalIncome = 0;
  let totalExpense = 0;

  for (const [accId, agg] of allRows) {
    const a = amap.get(accId);
    if (!a) continue;
    const dr = agg.debit;
    const cr = agg.credit;
    if (a.type === "asset") {
      const amt = dr - cr;
      if (Math.abs(amt) > 0.005) assets.push({ code: a.code as string, name: a.name as string, amount: Number(amt.toFixed(2)) });
    } else if (a.type === "liability") {
      const amt = cr - dr;
      if (Math.abs(amt) > 0.005) liabilities.push({ code: a.code as string, name: a.name as string, amount: Number(amt.toFixed(2)) });
    } else if (a.type === "equity") {
      const amt = cr - dr;
      if (Math.abs(amt) > 0.005) equity.push({ code: a.code as string, name: a.name as string, amount: Number(amt.toFixed(2)) });
    } else if (a.type === "income") {
      totalIncome += cr - dr;
    } else if (a.type === "expense") {
      totalExpense += dr - cr;
    }
  }

  for (const [accId, agg] of priorRows) {
    const a = amap.get(accId);
    if (!a) continue;
    const dr = agg.debit;
    const cr = agg.credit;
    if (a.type === "income") pyIncome += cr - dr;
    else if (a.type === "expense") pyExpense += dr - cr;
  }

  const openingRetainedEarnings = Number((pyIncome - pyExpense).toFixed(2));
  const cumulativeNetProfit = totalIncome - totalExpense;
  const periodNetProfit = Number((cumulativeNetProfit - (pyIncome - pyExpense)).toFixed(2));
  const openingEquity = Number(equity.reduce((s, e) => s + e.amount, 0).toFixed(2));

  const equityWithRetained = [...equity];
  if (Math.abs(openingRetainedEarnings) > 0.005) {
    equityWithRetained.push({ code: "RE", name: "Retained Earnings (prior years)", amount: openingRetainedEarnings });
  }
  if (Math.abs(periodNetProfit) > 0.005) {
    equityWithRetained.push({ code: "PNL", name: "Net Profit (current period)", amount: periodNetProfit });
  }

  assets.sort((a, b) => a.code.localeCompare(b.code));
  liabilities.sort((a, b) => a.code.localeCompare(b.code));

  const totalAssets = Number(assets.reduce((s, x) => s + x.amount, 0).toFixed(2));
  const totalLiabilities = Number(liabilities.reduce((s, x) => s + x.amount, 0).toFixed(2));
  const totalEquity = Number(equityWithRetained.reduce((s, x) => s + x.amount, 0).toFixed(2));
  const liabilitiesAndEquity = Number((totalLiabilities + totalEquity).toFixed(2));
  const difference = Number((totalAssets - liabilitiesAndEquity).toFixed(2));

  return {
    asOf,
    assets,
    liabilities,
    equity: equityWithRetained,
    totals: {
      assets: totalAssets,
      liabilities: totalLiabilities,
      equity: totalEquity,
      liabilitiesAndEquity,
      difference,
    },
    equityReconciliation: {
      fyStart,
      openingEquity,
      openingRetainedEarnings,
      periodNetProfit,
      totalEquity,
    },
  };
}

accountingRouter.get("/accounting/balance-sheet", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const asOf = String(req.query.asOf ?? new Date().toISOString().slice(0, 10));
  const data = await balanceSheetData(orgId, asOf);
  const format = String(req.query.format ?? "json");
  if (format === "csv") {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="balance-sheet-${asOf}.csv"`);
    const lines: string[] = [];
    lines.push(`# Balance Sheet as of ${asOf}`);
    lines.push("");
    lines.push("# Assets");
    lines.push("Code,Name,Amount");
    for (const a of data.assets) lines.push(`${a.code},${a.name},${a.amount}`);
    lines.push(`,Total Assets,${data.totals.assets}`);
    lines.push("");
    lines.push("# Liabilities");
    lines.push("Code,Name,Amount");
    for (const a of data.liabilities) lines.push(`${a.code},${a.name},${a.amount}`);
    lines.push(`,Total Liabilities,${data.totals.liabilities}`);
    lines.push("");
    lines.push("# Equity");
    lines.push("Code,Name,Amount");
    for (const a of data.equity) lines.push(`${a.code},${a.name},${a.amount}`);
    lines.push(`,Total Equity,${data.totals.equity}`);
    lines.push("");
    lines.push(`,Liabilities + Equity,${data.totals.liabilitiesAndEquity}`);
    lines.push(`,Difference,${data.totals.difference}`);
    res.send(lines.join("\n"));
    return;
  }
  if (format === "xlsx") {
    void sendXlsx(res, `balance-sheet-${asOf}`, [
      { name: "Assets", rows: [...data.assets, { code: "", name: "Total Assets", amount: data.totals.assets }] },
      { name: "Liabilities", rows: [...data.liabilities, { code: "", name: "Total Liabilities", amount: data.totals.liabilities }] },
      { name: "Equity", rows: [...data.equity, { code: "", name: "Total Equity", amount: data.totals.equity }] },
      { name: "Summary", rows: [{ ...data.totals, asOf }] },
      { name: "Reconciliation", rows: [data.equityReconciliation] },
    ]);
    return;
  }
  res.json(data);
});

// ── Vendor ageing ─────────────────────────────────────────────────────────
accountingRouter.get("/accounting/vendor-ageing", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const billsSnap = await db().collection("vendor_bills")
    .where("organizationId", "==", orgId)
    .get();
  const activeBills = billsSnap.docs.filter((bDoc) => {
    const status = bDoc.data().status as string;
    return status !== "paid" && status !== "cancelled" && status !== "draft";
  });
  const vrowsSnap = await db().collection("vendors").where("organizationId", "==", orgId).get();
  const vmap = new Map(vrowsSnap.docs.map((v) => [v.id, v.data()]));
  const now = Date.now();
  const buckets = new Map<string, { vendorId: string; vendorName: string; current: number; days30: number; days60: number; days90: number; daysOver90: number; total: number }>();
  for (const bDoc of activeBills) {
    const b = bDoc.data();
    const bal = Number(b.total ?? 0) - Number(b.amountPaid ?? 0);
    if (bal <= 0) continue;
    const vid = (b.vendorId as string) ?? "unknown";
    const vname = vmap.get(vid)?.name ?? "Unknown";
    const dueDate = b.dueDate instanceof Date ? b.dueDate.getTime() : new Date(b.dueDate).getTime();
    const issueDate = b.issueDate instanceof Date ? b.issueDate.getTime() : new Date(b.issueDate).getTime();
    const ref = dueDate || issueDate;
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

export default accountingRouter;
