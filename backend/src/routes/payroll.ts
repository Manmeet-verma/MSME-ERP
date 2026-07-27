import { Router } from "express";
import { getDb } from "../lib/firebase";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";
import { logger } from "../lib/logger";
import { reverseAndRepost } from "../lib/accounting";
import PDFDocument from "pdfkit";

const db = () => getDb();
const payrollRouter = Router();

function fmtRun(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    periodMonth: r.periodMonth as number,
    periodYear: r.periodYear as number,
    status: r.status as string,
    totalGross: Number(r.totalGross ?? 0),
    totalDeductions: Number(r.totalDeductions ?? 0),
    totalNet: Number(r.totalNet ?? 0),
    notes: (r.notes as string) ?? null,
    paidAt: (r.paidAt as string) ?? null,
    createdAt: (r.createdAt as string) ?? new Date().toISOString(),
  };
}

function fmtSlip(s: Record<string, unknown>) {
  return {
    id: s.id as string,
    payrollRunId: s.payrollRunId as string,
    employeeId: s.employeeId as string,
    basic: Number(s.basic ?? 0),
    hra: Number(s.hra ?? 0),
    allowances: Number(s.allowances ?? 0),
    daysWorked: Number(s.daysWorked ?? 0),
    daysInMonth: s.daysInMonth as number,
    lopAmount: Number(s.lopAmount ?? 0),
    pfAmount: Number(s.pfAmount ?? 0),
    esiAmount: Number(s.esiAmount ?? 0),
    otherDeductions: Number(s.otherDeductions ?? 0),
    gross: Number(s.gross ?? 0),
    deductions: Number(s.deductions ?? 0),
    net: Number(s.net ?? 0),
    status: s.status as string,
    paidAt: (s.paidAt as string) ?? null,
  };
}

function daysInMonth(year: number, month1: number) {
  return new Date(year, month1, 0).getDate();
}

payrollRouter.get("/payroll-runs", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const snap = await db().collection("payroll_runs")
    .where("organizationId", "==", orgId)
    .orderBy("periodYear", "desc")
    .orderBy("periodMonth", "desc")
    .get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  res.json(rows.map(fmtRun));
});

/**
 * Compute a payroll run for `orgId` for the given period. Inserts a payroll
 * run row + a payslip per active employee, and returns the freshly-totalled
 * run.
 */
export async function computePayrollRun(
  orgId: string,
  periodMonth: number,
  periodYear: number,
  notes: string | null = null,
): Promise<Record<string, unknown>> {
  const dim = daysInMonth(periodYear, periodMonth);
  const monthStart = `${periodYear}-${String(periodMonth).padStart(2, "0")}-01`;
  const monthEnd = `${periodYear}-${String(periodMonth).padStart(2, "0")}-${String(dim).padStart(2, "0")}`;

  const empsSnap = await db().collection("employees")
    .where("organizationId", "==", orgId)
    .where("status", "==", "active")
    .get();
  const attSnap = await db().collection("attendance")
    .where("organizationId", "==", orgId)
    .where("date", ">=", monthStart)
    .where("date", "<=", monthEnd)
    .get();

  const byEmp = new Map<string, FirebaseFirestore.QueryDocumentSnapshot[]>();
  for (const a of attSnap.docs) {
    const empId = a.data().employeeId as string;
    const arr = byEmp.get(empId) ?? [];
    arr.push(a);
    byEmp.set(empId, arr);
  }

  const now = new Date().toISOString();
  const runRef = await db().collection("payroll_runs").add({
    organizationId: orgId,
    periodMonth,
    periodYear,
    status: "computed",
    notes,
    totalGross: "0",
    totalDeductions: "0",
    totalNet: "0",
    createdAt: now,
  });

  let totalGross = 0;
  let totalDed = 0;
  let totalNet = 0;

  for (const empDoc of empsSnap.docs) {
    const emp = empDoc.data();
    const empId = empDoc.id;
    const recs = byEmp.get(empId) ?? [];
    let worked = 0;
    if (recs.length === 0) {
      worked = dim;
    } else {
      for (const r of recs) {
        const st = r.data().status as string;
        if (st === "present" || st === "leave" || st === "holiday" || st === "weekoff") worked += 1;
        else if (st === "half") worked += 0.5;
      }
    }
    const basic = Number(emp.basic ?? 0);
    const hra = Number(emp.hra ?? 0);
    const allowances = Number(emp.allowances ?? 0);
    const fullGross = basic + hra + allowances;
    const perDay = fullGross / dim;
    const lopDays = Math.max(0, dim - worked);
    const lop = Number((perDay * lopDays).toFixed(2));
    const grossThisMonth = Number((fullGross - lop).toFixed(2));
    const pf = emp.pfEnabled ? Number((basic * 0.12).toFixed(2)) : 0;
    const esi = emp.esiEnabled && grossThisMonth <= 21000 ? Number((grossThisMonth * 0.0075).toFixed(2)) : 0;
    const other = Number(emp.otherDeductions ?? 0);
    const deductions = Number((pf + esi + other).toFixed(2));
    const net = Number((grossThisMonth - deductions).toFixed(2));

    await db().collection("payslips").add({
      organizationId: orgId,
      payrollRunId: runRef.id,
      employeeId: empId,
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
      status: "computed",
      createdAt: now,
    });

    totalGross += grossThisMonth;
    totalDed += deductions;
    totalNet += net;
  }

  await db().collection("payroll_runs").doc(runRef.id).update({
    totalGross: totalGross.toFixed(2),
    totalDeductions: totalDed.toFixed(2),
    totalNet: totalNet.toFixed(2),
  });

  const updated = await db().collection("payroll_runs").doc(runRef.id).get();
  return { id: updated.id, ...updated.data()! };
}

payrollRouter.post("/payroll-runs", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user!.organizationId;
  const b = req.body ?? {};
  const periodMonth = Number(b.periodMonth);
  const periodYear = Number(b.periodYear);
  if (!periodMonth || !periodYear || periodMonth < 1 || periodMonth > 12) {
    res.status(400).json({ error: "periodMonth (1-12) and periodYear required" });
    return;
  }
  // Ensure idempotency
  const existingSnap = await db().collection("payroll_runs")
    .where("organizationId", "==", orgId)
    .where("periodMonth", "==", periodMonth)
    .where("periodYear", "==", periodYear)
    .get();
  if (!existingSnap.empty) {
    res.status(409).json({ error: `Payroll run already exists for ${periodMonth}/${periodYear}` });
    return;
  }
  const u = await computePayrollRun(orgId, periodMonth, periodYear, b.notes ?? null);
  await logAction(req, "CREATE", "payroll_run", u.id as string, `${periodMonth}/${periodYear}`);
  res.status(201).json(fmtRun(u));
});

payrollRouter.get("/payroll-runs/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = req.params.id;
  const runDoc = await db().collection("payroll_runs").doc(id).get();
  if (!runDoc.exists || runDoc.data()?.organizationId !== orgId) {
    res.status(404).json({ error: "Payroll run not found" });
    return;
  }
  const slipsSnap = await db().collection("payslips").where("payrollRunId", "==", id).get();
  const empsSnap = await db().collection("employees").where("organizationId", "==", orgId).get();
  const emap = new Map(empsSnap.docs.map((d) => [d.id, d.data()]));
  res.json({
    ...fmtRun({ id: runDoc.id, ...runDoc.data()! }),
    payslips: slipsSnap.docs.map((sDoc) => {
      const s = sDoc.data();
      return {
        ...fmtSlip({ id: sDoc.id, ...s }),
        employeeName: emap.get(s.employeeId as string)?.name ?? "",
        employeeCode: emap.get(s.employeeId as string)?.employeeCode ?? "",
      };
    }),
  });
});

payrollRouter.post("/payroll-runs/:id/mark-paid", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = req.params.id;
  const runDoc = await db().collection("payroll_runs").doc(id).get();
  if (!runDoc.exists || runDoc.data()?.organizationId !== orgId) {
    res.status(404).json({ error: "Payroll run not found" });
    return;
  }
  const runData = runDoc.data()!;
  const now = new Date().toISOString();
  await db().collection("payroll_runs").doc(id).update({ status: "paid", paidAt: now });

  const slipsSnap = await db().collection("payslips").where("payrollRunId", "==", id).get();
  for (const slipDoc of slipsSnap.docs) {
    await slipDoc.ref.update({ status: "paid", paidAt: now });
  }

  // Auto-post journal: Dr Salaries Expense, Cr Bank
  const gross = Number(runData.totalGross ?? 0);
  const deductions = Number(runData.totalDeductions ?? 0);
  const net = Number(runData.totalNet ?? 0);
  await reverseAndRepost(
    orgId,
    "payroll_run",
    id as unknown as number,
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
    { entryDate: new Date(), memo: `Payroll ${runData.periodMonth}/${runData.periodYear}` },
  );
  await logAction(req, "MARK_PAID", "payroll_run", id);

  let emailedCount = 0;
  try {
    const orgDoc = await db().collection("organizations").doc(orgId).get();
    const orgData = orgDoc.data();
    if (orgData?.payrollSettings?.emailPayslips) {
      emailedCount = await emailPayslipsForRun(orgId, id, req.user!.email, req.user!.userId);
    }
  } catch (err) {
    logger.error({ err, runId: id }, "Failed to email payslips after mark-paid");
  }
  res.json({ message: "Payroll marked paid", emailedPayslips: emailedCount });
});

export async function emailPayslipsForRun(
  orgId: string,
  runId: string,
  fromEmail: string,
  userId: string | null,
): Promise<number> {
  const runDoc = await db().collection("payroll_runs").doc(runId).get();
  if (!runDoc.exists) return 0;
  const runData = runDoc.data()!;
  const slipsSnap = await db().collection("payslips").where("payrollRunId", "==", runId).get();
  const empsSnap = await db().collection("employees").where("organizationId", "==", orgId).get();
  const empById = new Map(empsSnap.docs.map((d) => [d.id, d.data()]));
  const month = MONTHS[runData.periodMonth as number];
  const base = process.env.PUBLIC_APP_URL
    || (process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}` : "");
  let n = 0;
  for (const sDoc of slipsSnap.docs) {
    const s = sDoc.data();
    const emp = empById.get(s.employeeId as string);
    if (!emp?.email) continue;
    const subject = `Your payslip for ${month} ${runData.periodYear}`;
    const netPay = Number(s.net).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const pdfUrl = base ? `${base}/api/payslips/${sDoc.id}/pdf` : `/api/payslips/${sDoc.id}/pdf`;
    const body = `Hi ${emp.name},\n\n`
      + `Your salary for ${month} ${runData.periodYear} has been processed.\n\n`
      + `Net pay: ₹ ${netPay}\n\n`
      + `Download your payslip: ${pdfUrl}\n\n`
      + `Regards,\nPayroll`;
    const messageId = `<payslip.${sDoc.id}.${Date.now()}@msme-pro>`;
    await db().collection("emails").add({
      organizationId: orgId,
      userId: userId ?? null,
      direction: "outbound",
      fromEmail,
      toEmail: emp.email,
      subject,
      body,
      status: "sent",
      messageId,
      threadId: messageId,
      sentAt: new Date().toISOString(),
    });
    n += 1;
  }
  return n;
}

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function renderPayslip(
  doc: InstanceType<typeof PDFDocument>,
  slip: Record<string, unknown>,
  emp: Record<string, unknown> | undefined,
  run: Record<string, unknown>,
) {
  const month = MONTHS[run.periodMonth as number];
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
  doc.text(`Bank: ${emp?.bankName ?? "—"} ${emp?.bankAccount ? `(${String(emp.bankAccount).slice(-4)})` : ""}`, left + 280, y);
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
  const id = req.params.id;
  const slipDoc = await db().collection("payslips").doc(id).get();
  if (!slipDoc.exists || slipDoc.data()?.organizationId !== orgId) {
    res.status(404).json({ error: "Payslip not found" });
    return;
  }
  const slipData = slipDoc.data()!;
  const empDoc = await db().collection("employees").doc(slipData.employeeId as string).get();
  const runDoc = await db().collection("payroll_runs").doc(slipData.payrollRunId as string).get();
  const runData = runDoc.data()!;
  const month = MONTHS[runData.periodMonth as number];
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="payslip-${(empDoc.data()?.employeeCode) ?? id}-${month}-${runData.periodYear}.pdf"`);
  const doc = new PDFDocument({ size: "A4", margin: 48 });
  doc.pipe(res);
  renderPayslip(doc, slipData, empDoc.data(), runData);
  doc.end();
});

payrollRouter.get("/payroll-runs/:id/payslips.pdf", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = req.params.id;
  const runDoc = await db().collection("payroll_runs").doc(id).get();
  if (!runDoc.exists || runDoc.data()?.organizationId !== orgId) {
    res.status(404).json({ error: "Run not found" });
    return;
  }
  const runData = runDoc.data()!;
  const slipsSnap = await db().collection("payslips").where("payrollRunId", "==", id).get();
  if (slipsSnap.empty) {
    res.status(400).json({ error: "Run has no payslips" });
    return;
  }
  const empsSnap = await db().collection("employees").where("organizationId", "==", orgId).get();
  const empById = new Map(empsSnap.docs.map((d) => [d.id, d.data()]));
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="payslips-${MONTHS[runData.periodMonth as number]}-${runData.periodYear}.pdf"`);
  const doc = new PDFDocument({ size: "A4", margin: 48, autoFirstPage: false });
  doc.pipe(res);
  for (const sDoc of slipsSnap.docs) {
    doc.addPage();
    renderPayslip(doc, sDoc.data(), empById.get(sDoc.data().employeeId as string), runData);
  }
  doc.end();
});

payrollRouter.get("/payroll-runs/:id/payments.csv", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = req.params.id;
  const runDoc = await db().collection("payroll_runs").doc(id).get();
  if (!runDoc.exists || runDoc.data()?.organizationId !== orgId) {
    res.status(404).json({ error: "Run not found" });
    return;
  }
  const runData = runDoc.data()!;
  const slipsSnap = await db().collection("payslips").where("payrollRunId", "==", id).get();
  const empsSnap = await db().collection("employees").where("organizationId", "==", orgId).get();
  const empById = new Map(empsSnap.docs.map((d) => [d.id, d.data()]));
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ["Employee Code", "Employee Name", "Bank Name", "Account Number", "IFSC", "PAN", "Net Pay (INR)"];
  const lines = [header.join(",")];
  for (const sDoc of slipsSnap.docs) {
    const s = sDoc.data();
    const e = empById.get(s.employeeId as string);
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
  res.setHeader("Content-Disposition", `attachment; filename="payroll-payments-${MONTHS[runData.periodMonth as number]}-${runData.periodYear}.csv"`);
  res.send(lines.join("\n"));
});

export default payrollRouter;
