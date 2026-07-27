import { Router } from "express";
import { getDb } from "../lib/firebase";
import { requireAuth } from "../middlewares/auth";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import type { Response } from "express";

const db = () => getDb();

const reportsR4Router = Router();

function parseDateRange(req: { query: Record<string, unknown> }) {
  const from = req.query.from ? new Date(String(req.query.from)) : new Date(new Date().getFullYear(), 0, 1);
  const to = req.query.to ? new Date(String(req.query.to)) : new Date();
  return { from, to };
}

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}

async function sendXlsx(res: Response, name: string, rows: Array<Record<string, unknown>>) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(name.slice(0, 31));
  if (rows.length > 0) {
    const headers = Object.keys(rows[0]);
    ws.columns = headers.map((h) => ({ header: h, key: h, width: Math.max(12, Math.min(40, h.length + 4)) }));
    ws.getRow(1).font = { bold: true };
    for (const r of rows) ws.addRow(r);
  } else {
    ws.addRow(["(no data)"]);
  }
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${name}.xlsx"`);
  const buf = await wb.xlsx.writeBuffer();
  res.end(Buffer.from(buf as ArrayBuffer));
}

function sendPdf(res: Response, name: string, label: string, rows: Array<Record<string, unknown>>) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${name}.pdf"`);
  const doc = new PDFDocument({ size: "A4", margin: 36, layout: "landscape" });
  doc.pipe(res);
  doc.fontSize(16).text(label, { align: "left" });
  doc.moveDown(0.3);
  doc.fontSize(9).fillColor("#555").text(`Generated ${new Date().toLocaleString()}`);
  doc.moveDown(0.6).fillColor("black");
  if (rows.length === 0) {
    doc.fontSize(11).text("No data.");
    doc.end();
    return;
  }
  const headers = Object.keys(rows[0]);
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const colWidth = pageWidth / headers.length;
  const lineHeight = 14;
  doc.fontSize(9).fillColor("white");
  let x = doc.page.margins.left;
  const y = doc.y;
  doc.rect(x, y - 2, pageWidth, lineHeight + 2).fill("#1f2937");
  doc.fillColor("white");
  for (const h of headers) {
    doc.text(h, x + 3, y + 1, { width: colWidth - 6, ellipsis: true });
    x += colWidth;
  }
  doc.fillColor("black");
  doc.moveDown(0.5);
  let rowY = y + lineHeight + 2;
  doc.fontSize(8);
  for (const r of rows) {
    if (rowY > doc.page.height - doc.page.margins.bottom - lineHeight) {
      doc.addPage();
      rowY = doc.page.margins.top;
    }
    let cx = doc.page.margins.left;
    for (const h of headers) {
      const v = r[h];
      const s = v == null ? "" : String(v);
      doc.text(s, cx + 3, rowY, { width: colWidth - 6, ellipsis: true });
      cx += colWidth;
    }
    rowY += lineHeight;
  }
  doc.end();
}

function respond(
  req: { query: Record<string, unknown> },
  res: Response,
  name: string,
  rows: Array<Record<string, unknown>>,
  label?: string,
) {
  const format = String(req.query.format ?? "json");
  if (format === "csv") {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${name}.csv"`);
    res.send(toCsv(rows));
    return;
  }
  if (format === "xlsx") {
    void sendXlsx(res, name, rows);
    return;
  }
  if (format === "pdf") {
    sendPdf(res, name, label ?? name, rows);
    return;
  }
  res.json(rows);
}

reportsR4Router.get("/reports/sales-register", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const { from, to } = parseDateRange(req);
  const invSnap = await db().collection("invoices").where("organizationId", "==", orgId).get();
  const rows = invSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((r) => {
      const issue = r.issueDate as string;
      return issue >= from.toISOString() && issue <= to.toISOString();
    });
  rows.sort((a, b) => ((a.issueDate as string) ?? "").localeCompare((b.issueDate as string) ?? ""));
  const clientSnap = await db().collection("clients").where("organizationId", "==", orgId).get();
  const cmap = new Map(clientSnap.docs.map((d) => [d.id, d.data()]));
  const data = rows.map((r) => ({
    invoiceNumber: r.invoiceNumber,
    issueDate: (r.issueDate as string)?.slice(0, 10),
    clientName: r.clientId ? (cmap.get(r.clientId as string)?.name as string) ?? "" : "",
    status: r.status,
    subtotal: Number(r.subtotal),
    cgst: Number(r.cgst),
    sgst: Number(r.sgst),
    igst: Number(r.igst),
    total: Number(r.total),
    amountPaid: Number(r.amountPaid),
    balance: Number(r.total) - Number(r.amountPaid),
  }));
  respond(req, res, "sales-register", data, "Sales register");
});

reportsR4Router.get("/reports/purchase-register", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const { from, to } = parseDateRange(req);
  const poSnap = await db().collection("purchase_orders").where("organizationId", "==", orgId).get();
  const rows = poSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((r) => {
      const created = r.createdAt as string;
      return created >= from.toISOString() && created <= to.toISOString();
    });
  rows.sort((a, b) => ((a.createdAt as string) ?? "").localeCompare((b.createdAt as string) ?? ""));
  const vendorSnap = await db().collection("vendors").where("organizationId", "==", orgId).get();
  const vmap = new Map(vendorSnap.docs.map((d) => [d.id, d.data()]));
  const data = rows.map((r) => ({
    poNumber: r.poNumber,
    date: (r.createdAt as string)?.slice(0, 10),
    vendorName: r.vendorId ? (vmap.get(r.vendorId as string)?.name as string) ?? "" : "",
    status: r.status,
    subtotal: Number(r.subtotal),
    taxAmount: Number(r.taxAmount),
    total: Number(r.total),
  }));
  respond(req, res, "purchase-register", data, "Purchase register");
});

reportsR4Router.get("/reports/customer-ageing", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const invSnap = await db().collection("invoices").where("organizationId", "==", orgId).get();
  const rows = invSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const clientSnap = await db().collection("clients").where("organizationId", "==", orgId).get();
  const cmap = new Map(clientSnap.docs.map((d) => [d.id, d.data()]));
  const now = Date.now();
  const buckets = new Map<string, { clientId: string; clientName: string; current: number; days30: number; days60: number; days90: number; daysOver90: number; total: number }>();
  for (const inv of rows) {
    if (["paid", "cancelled", "draft"].includes(inv.status as string)) continue;
    const balance = Number(inv.total) - Number(inv.amountPaid);
    if (balance <= 0) continue;
    const cid = (inv.clientId as string) ?? "0";
    const cname = (cmap.get(cid)?.name as string) ?? "Unknown";
    const dueStr = inv.dueDate as string | undefined;
    const issueStr = inv.issueDate as string;
    const refTime = dueStr ? new Date(dueStr).getTime() : new Date(issueStr).getTime();
    const ageDays = Math.max(0, Math.floor((now - refTime) / 86400000));
    const b = buckets.get(cid) ?? { clientId: cid, clientName: cname, current: 0, days30: 0, days60: 0, days90: 0, daysOver90: 0, total: 0 };
    if (ageDays <= 0) b.current += balance;
    else if (ageDays <= 30) b.days30 += balance;
    else if (ageDays <= 60) b.days60 += balance;
    else if (ageDays <= 90) b.days90 += balance;
    else b.daysOver90 += balance;
    b.total += balance;
    buckets.set(cid, b);
  }
  respond(req, res, "customer-ageing", [...buckets.values()].sort((a, b) => b.total - a.total), "Customer ageing");
});

reportsR4Router.get("/reports/top-items", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const invSnap = await db().collection("invoices").where("organizationId", "==", orgId).get();
  const orgInvoices = invSnap.docs.filter((d) => d.data().status !== "cancelled");
  const invIds = new Set(orgInvoices.map((d) => d.id));
  if (invIds.size === 0) {
    respond(req, res, "top-items", [], "Top items");
    return;
  }
  const allQiSnap = await db().collection("invoice_items").get();
  const items = allQiSnap.docs
    .map((d) => d.data())
    .filter((r) => invIds.has(r.invoiceId as string));
  // Group by description
  const descMap = new Map<string, { qty: number; revenue: number }>();
  for (const i of items) {
    const desc = i.description as string;
    const entry = descMap.get(desc) ?? { qty: 0, revenue: 0 };
    entry.qty += Number(i.quantity ?? 0);
    entry.revenue += Number(i.totalPrice ?? 0);
    descMap.set(desc, entry);
  }
  const sorted = Array.from(descMap.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 20);
  respond(
    req,
    res,
    "top-items",
    sorted.map((i) => ({ name: i.name, quantity: i.qty, revenue: i.revenue })),
    "Top items",
  );
});

reportsR4Router.get("/reports/lead-source-roi", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const leadsSnap = await db().collection("leads").where("organizationId", "==", orgId).get();
  const allLeads = leadsSnap.docs.map((d) => d.data());
  // Source breakdown
  const sourceMap = new Map<string, { total: number; won: number; lost: number }>();
  for (const l of allLeads) {
    const src = l.source as string;
    const entry = sourceMap.get(src) ?? { total: 0, won: 0, lost: 0 };
    entry.total += 1;
    if (l.status === "won") entry.won += 1;
    if (l.status === "lost") entry.lost += 1;
    sourceMap.set(src, entry);
  }
  // Revenue per source
  const wonLeads = allLeads.filter((l) => l.status === "won");
  const clientIds = wonLeads.map((l) => l.convertedClientId).filter(Boolean) as string[];
  const invMap = new Map<string, number>();
  if (clientIds.length) {
    const invSnap = await db().collection("invoices").where("organizationId", "==", orgId).get();
    for (const d of invSnap.docs) {
      const inv = d.data();
      if (clientIds.includes(inv.clientId as string)) {
        invMap.set(inv.clientId as string, (invMap.get(inv.clientId as string) ?? 0) + Number(inv.amountPaid));
      }
    }
  }
  const revBySource = new Map<string, number>();
  for (const l of wonLeads) {
    const rev = invMap.get(l.convertedClientId as string) ?? 0;
    revBySource.set(l.source as string, (revBySource.get(l.source as string) ?? 0) + rev);
  }
  respond(
    req,
    res,
    "lead-source-roi",
    Array.from(sourceMap.entries()).map(([source, v]) => ({
      source,
      total: v.total,
      won: v.won,
      lost: v.lost,
      conversionPct: v.total > 0 ? Math.round((v.won / v.total) * 100) : 0,
      revenue: revBySource.get(source) ?? 0,
    })),
    "Lead source ROI",
  );
});

reportsR4Router.get("/reports/social-engagement", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const postsSnap = await db().collection("social_posts").where("organizationId", "==", orgId).get();
  const posts = postsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const resultsSnap = await db().collection("social_post_results").where("organizationId", "==", orgId).get();
  const allResults = resultsSnap.docs.map((d) => d.data());
  const byPost = new Map<string, Record<string, unknown>[]>();
  for (const r of allResults) {
    const arr = byPost.get(r.postId as string) ?? [];
    arr.push(r);
    byPost.set(r.postId as string, arr);
  }
  const data = posts
    .filter((p) => p.status === "posted" || p.status === "partial")
    .map((p) => {
      const r = byPost.get(p.id as string) ?? [];
      const likes = r.reduce((s, x) => s + Number((x.metrics as Record<string, number>)?.likes ?? 0), 0);
      const comments = r.reduce((s, x) => s + Number((x.metrics as Record<string, number>)?.comments ?? 0), 0);
      const shares = r.reduce((s, x) => s + Number((x.metrics as Record<string, number>)?.shares ?? 0), 0);
      const impressions = r.reduce((s, x) => s + Number((x.metrics as Record<string, number>)?.impressions ?? 0), 0);
      return {
        id: p.id,
        content: (p.content as string).slice(0, 60),
        platforms: ((p.platforms as string[]) ?? []).join(", "),
        publishedAt: (p.publishedAt as string) ?? null,
        likes,
        comments,
        shares,
        impressions,
      };
    });
  respond(req, res, "social-engagement", data, "Social engagement");
});

reportsR4Router.get("/reports/email-performance", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const campaignsSnap = await db().collection("campaigns").where("organizationId", "==", orgId).get();
  const campaigns = campaignsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const recsSnap = await db().collection("campaign_recipients").where("organizationId", "==", orgId).get();
  const recs = recsSnap.docs.map((d) => d.data());
  const data = campaigns.map((c) => {
    const r = recs.filter((x) => x.campaignId === c.id);
    const sent = r.filter((x) => ["sent", "opened", "clicked"].includes(x.status as string)).length;
    const opened = r.filter((x) => ["opened", "clicked"].includes(x.status as string)).length;
    const clicked = r.filter((x) => x.status === "clicked").length;
    return {
      campaignId: c.id,
      name: c.name,
      subject: c.subject,
      sentAt: (c.sentAt as string) ?? null,
      sent,
      opened,
      clicked,
      openRate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
      clickRate: sent > 0 ? Math.round((clicked / sent) * 100) : 0,
    };
  });
  const emailsSnap = await db().collection("emails").where("organizationId", "==", orgId).where("direction", "==", "outbound").get();
  const tot = emailsSnap.size;
  const op = emailsSnap.docs.filter((d) => d.data().status === "opened").length;
  respond(req, res, "email-performance", [
    ...data,
    {
      campaignId: 0,
      name: "(transactional)",
      subject: "All non-campaign sent emails",
      sentAt: null,
      sent: tot,
      opened: op,
      clicked: 0,
      openRate: tot > 0 ? Math.round((op / tot) * 100) : 0,
      clickRate: 0,
    },
  ], "Email performance");
});

reportsR4Router.get("/reports/catalog", requireAuth, async (_req, res) => {
  res.json([
    { key: "sales-register", label: "Sales register", description: "Invoice-by-invoice register with GST split.", path: "/reports/sales-register" },
    { key: "purchase-register", label: "Purchase register", description: "Purchase orders with tax and totals.", path: "/reports/purchase-register" },
    { key: "customer-ageing", label: "Customer ageing", description: "Outstanding balances bucketed by age.", path: "/reports/customer-ageing" },
    { key: "top-items", label: "Top items sold", description: "Top 20 items by invoiced revenue.", path: "/reports/top-items" },
    { key: "lead-source-roi", label: "Lead source ROI", description: "Conversion and revenue by lead source.", path: "/reports/lead-source-roi" },
    { key: "social-engagement", label: "Social engagement", description: "Per-post likes, comments, shares.", path: "/reports/social-engagement" },
    { key: "email-performance", label: "Email performance", description: "Open and click rates per campaign.", path: "/reports/email-performance" },
  ]);
});

export default reportsR4Router;
