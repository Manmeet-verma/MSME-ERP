import { Router } from "express";
import { db, payrollRunsTable, payslipsTable, employeesTable, attendanceTable } from "@workspace/db";
import { and, eq, desc, gte, lte } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";
import { postJournal, reverseAndRepost } from "../lib/accounting";
import PDFDocument from "pdfkit";

const payrollRouter = Router();

function fmtRun(r: typeof payrollRunsTable.$inferSelect) {
  return {
    id: r.id,
    periodMonth: r.periodMonth,
    periodYear: r.periodYear,
    status: r.status,
    totalGross: Number(r.totalGross),
    totalDeductions: Number(r.totalDeductions),
    totalNet: Number(r.totalNet),
    notes: r.notes ?? null,
    paidAt: r.paidAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}

function fmtSlip(s: typeof payslipsTable.$inferSelect) {
  return {
    id: s.id,
    payrollRunId: s.payrollRunId,
    employeeId: s.employeeId,
    basic: Number(s.basic),
    hra: Number(s.hra),
    allowances: Number(s.allowances),
    daysWorked: Number(s.daysWorked),
    daysInMonth: s.daysInMonth,
    lopAmount: Number(s.lopAmount),
    pfAmount: Number(s.pfAmount),
    esiAmount: Number(s.esiAmount),
    otherDeductions: Number(s.otherDeductions),
    gross: Number(s.gross),
    deductions: Number(s.deductions),
    net: Number(s.net),
    status: s.status,
    paidAt: s.paidAt?.toISOString() ?? null,
  };
}

function daysInMonth(year: number, month1: number) {
  return new Date(year, month1, 0).getDate();
}

payrollRouter.get("/payroll-runs", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const rows = await db
    .select()
    .from(payrollRunsTable)
    .where(eq(payrollRunsTable.organizationId, orgId))
    .orderBy(desc(payrollRunsTable.periodYear), desc(payrollRunsTable.periodMonth));
  res.json(rows.map(fmtRun));
});

payrollRouter.post("/payroll-runs", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user!.organizationId;
  const b = req.body ?? {};
  const periodMonth = Number(b.periodMonth);
  const periodYear = Number(b.periodYear);
  if (!periodMonth || !periodYear || periodMonth < 1 || periodMonth > 12) {
    res.status(400).json({ error: "periodMonth (1-12) and periodYear required" });
    return;
  }
  // Compute attendance for the month
  const dim = daysInMonth(periodYear, periodMonth);
  const monthStart = `${periodYear}-${String(periodMonth).padStart(2, "0")}-01`;
  const monthEnd = `${periodYear}-${String(periodMonth).padStart(2, "0")}-${String(dim).padStart(2, "0")}`;
  const employees = await db
    .select()
    .from(employeesTable)
    .where(and(eq(employeesTable.organizationId, orgId), eq(employeesTable.status, "active")));
  const att = await db
    .select()
    .from(attendanceTable)
    .where(
      and(
        eq(attendanceTable.organizationId, orgId),
        gte(attendanceTable.date, monthStart),
        lte(attendanceTable.date, monthEnd),
      ),
    );
  const byEmp = new Map<number, typeof att>();
  for (const a of att) {
    const arr = byEmp.get(a.employeeId) ?? [];
    arr.push(a);
    byEmp.set(a.employeeId, arr);
  }
  // Create the run
  const [run] = await db
    .insert(payrollRunsTable)
    .values({
      organizationId: orgId,
      periodMonth,
      periodYear,
      status: "computed",
      notes: b.notes ?? null,
    })
    .returning();
  let totalGross = 0;
  let totalDed = 0;
  let totalNet = 0;
  for (const emp of employees) {
    const recs = byEmp.get(emp.id) ?? [];
    // Days worked: present=1, half=0.5, leave/holiday/weekoff=1 (paid), absent=0
    // If no records exist at all, assume all month present (so payroll works
    // out of the box without forcing attendance entry).
    let worked = 0;
    if (recs.length === 0) {
      worked = dim;
    } else {
      for (const r of recs) {
        if (r.status === "present" || r.status === "leave" || r.status === "holiday" || r.status === "weekoff") worked += 1;
        else if (r.status === "half") worked += 0.5;
      }
    }
    const basic = Number(emp.basic);
    const hra = Number(emp.hra);
    const allowances = Number(emp.allowances);
    const fullGross = basic + hra + allowances;
    const perDay = fullGross / dim;
    const lopDays = Math.max(0, dim - worked);
    const lop = Number((perDay * lopDays).toFixed(2));
    const grossThisMonth = Number((fullGross - lop).toFixed(2));
    const pf = emp.pfEnabled ? Number((basic * 0.12).toFixed(2)) : 0;
    const esi = emp.esiEnabled && grossThisMonth <= 21000 ? Number((grossThisMonth * 0.0075).toFixed(2)) : 0;
    const other = Number(emp.otherDeductions);
    const deductions = Number((pf + esi + other).toFixed(2));
    const net = Number((grossThisMonth - deductions).toFixed(2));
    await db.insert(payslipsTable).values({
      organizationId: orgId,
      payrollRunId: run.id,
      employeeId: emp.id,
      basic: basic.toFixed(2),
      hra: hra.toFixed(2),
      allowances: allowances.toFixed(2),
      daysWorked: worked.toFixed(2),
      daysInMonth: dim,
      lopAmount: lop.toFixed(2),
      pfAmount: pf.toFixed(2),
      esiAmount: esi.toFixed(2),
      otherDeductions: other.toFixed(2),
      gross: grossThisMonth.toFixed(2),
      deductions: deductions.toFixed(2),
      net: net.toFixed(2),
    });
    totalGross += grossThisMonth;
    totalDed += deductions;
    totalNet += net;
  }
  await db
    .update(payrollRunsTable)
    .set({
      totalGross: totalGross.toFixed(2),
      totalDeductions: totalDed.toFixed(2),
      totalNet: totalNet.toFixed(2),
    })
    .where(eq(payrollRunsTable.id, run.id));
  const [u] = await db.select().from(payrollRunsTable).where(eq(payrollRunsTable.id, run.id));
  await logAction(req, "CREATE", "payroll_run", run.id, `${periodMonth}/${periodYear}`);
  res.status(201).json(fmtRun(u));
});

payrollRouter.get("/payroll-runs/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  const [run] = await db
    .select()
    .from(payrollRunsTable)
    .where(and(eq(payrollRunsTable.id, id), eq(payrollRunsTable.organizationId, orgId)));
  if (!run) {
    res.status(404).json({ error: "Payroll run not found" });
    return;
  }
  const slips = await db
    .select()
    .from(payslipsTable)
    .where(eq(payslipsTable.payrollRunId, id));
  const emps = await db.select().from(employeesTable).where(eq(employeesTable.organizationId, orgId));
  const emap = new Map(emps.map((e) => [e.id, e]));
  res.json({
    ...fmtRun(run),
    payslips: slips.map((s) => ({
      ...fmtSlip(s),
      employeeName: emap.get(s.employeeId)?.name ?? "",
      employeeCode: emap.get(s.employeeId)?.employeeCode ?? "",
    })),
  });
});

payrollRouter.post("/payroll-runs/:id/mark-paid", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  const [run] = await db
    .select()
    .from(payrollRunsTable)
    .where(and(eq(payrollRunsTable.id, id), eq(payrollRunsTable.organizationId, orgId)));
  if (!run) {
    res.status(404).json({ error: "Payroll run not found" });
    return;
  }
  const now = new Date();
  await db
    .update(payrollRunsTable)
    .set({ status: "paid", paidAt: now })
    .where(eq(payrollRunsTable.id, id));
  await db
    .update(payslipsTable)
    .set({ status: "paid", paidAt: now })
    .where(eq(payslipsTable.payrollRunId, id));
  // Auto-post journal: Dr Salaries Expense, Cr Bank
  const gross = Number(run.totalGross);
  const deductions = Number(run.totalDeductions);
  const net = Number(run.totalNet);
  await reverseAndRepost(
    orgId,
    "payroll_run",
    id,
    async () => {
      const lines = [
        { accountCode: "5100", debit: gross, description: "Salaries (gross)" },
        { accountCode: "1010", credit: net, description: "Salaries paid (net)" },
      ];
      if (deductions > 0) {
        lines.push({ accountCode: "2200", credit: deductions, description: "PF/ESI/Other deductions" });
      }
      return lines;
    },
    { entryDate: now, memo: `Payroll ${run.periodMonth}/${run.periodYear}` },
  );
  await logAction(req, "MARK_PAID", "payroll_run", id);
  res.json({ message: "Payroll marked paid" });
});

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function renderPayslip(
  doc: InstanceType<typeof PDFDocument>,
  slip: typeof payslipsTable.$inferSelect,
  emp: typeof employeesTable.$inferSelect | undefined,
  run: typeof payrollRunsTable.$inferSelect,
) {
  const month = MONTHS[run.periodMonth];
  doc.fontSize(18).fillColor("black").text("Salary Slip", { align: "center" });
  doc.moveDown(0.4);
  doc.fontSize(11).fillColor("#555").text(`Pay period: ${month} ${run.periodYear}`, { align: "center" });
  doc.moveDown().fillColor("black");
  doc.fontSize(11);
  const left = 48;
  let y = doc.y;
  doc.text(`Employee: ${emp?.name ?? ""}`, left, y);
  doc.text(`Code: ${emp?.employeeCode ?? ""}`, left + 280, y);
  y += 16;
  doc.text(`PAN: ${emp?.panNumber ?? "—"}`, left, y);
  doc.text(`Bank: ${emp?.bankName ?? "—"} ${emp?.bankAccount ? `(${emp.bankAccount.slice(-4)})` : ""}`, left + 280, y);
  y += 16;
  doc.text(`Days worked: ${Number(slip.daysWorked)} / ${slip.daysInMonth}`, left, y);
  doc.moveDown(2);
  doc.fontSize(12).fillColor("#1f2937").text("Earnings", left);
  doc.fontSize(10).fillColor("black");
  const fmt = (n: number) => `₹ ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const erow = (label: string, amount: number) => {
    const cy = doc.y;
    doc.text(label, left, cy);
    doc.text(fmt(amount), left + 360, cy, { width: 120, align: "right" });
    doc.moveDown(0.4);
  };
  erow("Basic", Number(slip.basic));
  erow("HRA", Number(slip.hra));
  erow("Allowances", Number(slip.allowances));
  erow("Less: Loss of pay", -Number(slip.lopAmount));
  doc.moveDown(0.3);
  doc.fontSize(11).fillColor("#1f2937");
  erow("Gross", Number(slip.gross));
  doc.moveDown(0.8);
  doc.fontSize(12).fillColor("#1f2937").text("Deductions", left);
  doc.fontSize(10).fillColor("black");
  erow("Provident Fund", Number(slip.pfAmount));
  erow("ESI", Number(slip.esiAmount));
  erow("Other deductions", Number(slip.otherDeductions));
  doc.moveDown(0.3);
  doc.fontSize(11).fillColor("#1f2937");
  erow("Total deductions", Number(slip.deductions));
  doc.moveDown(0.8);
  doc.fontSize(14).fillColor("black");
  const fy = doc.y;
  doc.rect(left, fy - 4, 500, 28).fill("#e0f2fe");
  doc.fillColor("#0c4a6e");
  doc.text("Net pay", left + 12, fy + 4);
  doc.text(fmt(Number(slip.net)), left + 360, fy + 4, { width: 130, align: "right" });
  doc.fillColor("black");
  doc.moveDown(3);
  doc.fontSize(9).fillColor("#666").text(
    "This is a system-generated payslip. No signature required.",
    { align: "center" },
  );
}

payrollRouter.get("/payslips/:id/pdf", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  const [slip] = await db
    .select()
    .from(payslipsTable)
    .where(and(eq(payslipsTable.id, id), eq(payslipsTable.organizationId, orgId)));
  if (!slip) {
    res.status(404).json({ error: "Payslip not found" });
    return;
  }
  const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, slip.employeeId));
  const [run] = await db.select().from(payrollRunsTable).where(eq(payrollRunsTable.id, slip.payrollRunId));
  const month = MONTHS[run.periodMonth];
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="payslip-${emp?.employeeCode ?? id}-${month}-${run.periodYear}.pdf"`);
  const doc = new PDFDocument({ size: "A4", margin: 48 });
  doc.pipe(res);
  renderPayslip(doc, slip, emp, run);
  doc.end();
});

// Bulk: single PDF containing all payslips for a run (one slip per page).
payrollRouter.get("/payroll-runs/:id/payslips.pdf", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  const [run] = await db
    .select()
    .from(payrollRunsTable)
    .where(and(eq(payrollRunsTable.id, id), eq(payrollRunsTable.organizationId, orgId)));
  if (!run) { res.status(404).json({ error: "Run not found" }); return; }
  const slips = await db.select().from(payslipsTable).where(eq(payslipsTable.payrollRunId, id));
  if (slips.length === 0) { res.status(400).json({ error: "Run has no payslips" }); return; }
  const emps = await db.select().from(employeesTable).where(eq(employeesTable.organizationId, orgId));
  const empById = new Map(emps.map((e) => [e.id, e]));
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="payslips-${MONTHS[run.periodMonth]}-${run.periodYear}.pdf"`);
  const doc = new PDFDocument({ size: "A4", margin: 48, autoFirstPage: false });
  doc.pipe(res);
  for (let i = 0; i < slips.length; i++) {
    doc.addPage();
    renderPayslip(doc, slips[i], empById.get(slips[i].employeeId), run);
  }
  doc.end();
});

// Bulk: bank-friendly payments CSV for a run (employee, account, IFSC, net).
payrollRouter.get("/payroll-runs/:id/payments.csv", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  const [run] = await db
    .select()
    .from(payrollRunsTable)
    .where(and(eq(payrollRunsTable.id, id), eq(payrollRunsTable.organizationId, orgId)));
  if (!run) { res.status(404).json({ error: "Run not found" }); return; }
  const slips = await db.select().from(payslipsTable).where(eq(payslipsTable.payrollRunId, id));
  const emps = await db.select().from(employeesTable).where(eq(employeesTable.organizationId, orgId));
  const empById = new Map(emps.map((e) => [e.id, e]));
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ["Employee Code", "Employee Name", "Bank Name", "Account Number", "IFSC", "PAN", "Net Pay (INR)"];
  const lines = [header.join(",")];
  for (const s of slips) {
    const e = empById.get(s.employeeId);
    lines.push([
      esc(e?.employeeCode),
      esc(e?.name),
      esc(e?.bankName),
      esc(e?.bankAccount),
      esc(e?.ifsc),
      esc(e?.panNumber),
      Number(s.net).toFixed(2),
    ].join(","));
  }
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="payroll-payments-${MONTHS[run.periodMonth]}-${run.periodYear}.csv"`);
  res.send(lines.join("\n"));
});

// Mark unused
void postJournal;

export default payrollRouter;
