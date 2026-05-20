import { Router } from "express";
import {
  db,
  invoicesTable,
  invoiceItemsTable,
  paymentsTable,
  purchaseOrdersTable,
  purchaseOrderItemsTable,
  vendorsTable,
  itemsTable,
  clientsTable,
  leadsTable,
  emailsTable,
  socialPostsTable,
  socialPostResultsTable,
  campaignsTable,
  campaignRecipientsTable,
  quotationsTable,
} from "@workspace/db";
import { and, eq, sql, gte, lte, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import type { Response } from "express";

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
  // Header row
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
  // Data rows
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
  const rows = await db
    .select()
    .from(invoicesTable)
    .where(and(eq(invoicesTable.organizationId, orgId), gte(invoicesTable.issueDate, from), lte(invoicesTable.issueDate, to)))
    .orderBy(invoicesTable.issueDate);
  const clientRows = await db.select().from(clientsTable).where(eq(clientsTable.organizationId, orgId));
  const cmap = new Map(clientRows.map((c) => [c.id, c]));
  const data = rows.map((r) => ({
    invoiceNumber: r.invoiceNumber,
    issueDate: r.issueDate.toISOString().slice(0, 10),
    clientName: r.clientId ? cmap.get(r.clientId)?.name ?? "" : "",
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
  const rows = await db
    .select()
    .from(purchaseOrdersTable)
    .where(and(eq(purchaseOrdersTable.organizationId, orgId), gte(purchaseOrdersTable.createdAt, from), lte(purchaseOrdersTable.createdAt, to)))
    .orderBy(purchaseOrdersTable.createdAt);
  const vendorRows = await db.select().from(vendorsTable).where(eq(vendorsTable.organizationId, orgId));
  const vmap = new Map(vendorRows.map((v) => [v.id, v]));
  const data = rows.map((r) => ({
    poNumber: r.poNumber,
    date: r.createdAt.toISOString().slice(0, 10),
    vendorName: r.vendorId ? vmap.get(r.vendorId)?.name ?? "" : "",
    status: r.status,
    subtotal: Number(r.subtotal),
    taxAmount: Number(r.taxAmount),
    total: Number(r.total),
  }));
  respond(req, res, "purchase-register", data, "Purchase register");
});

reportsR4Router.get("/reports/customer-ageing", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const rows = await db
    .select()
    .from(invoicesTable)
    .where(and(eq(invoicesTable.organizationId, orgId), sql`${invoicesTable.status} not in ('paid','cancelled','draft')`));
  const clientRows = await db.select().from(clientsTable).where(eq(clientsTable.organizationId, orgId));
  const cmap = new Map(clientRows.map((c) => [c.id, c]));
  const now = Date.now();
  const buckets = new Map<number, { clientId: number; clientName: string; current: number; days30: number; days60: number; days90: number; daysOver90: number; total: number }>();
  for (const inv of rows) {
    const balance = Number(inv.total) - Number(inv.amountPaid);
    if (balance <= 0) continue;
    const cid = inv.clientId ?? 0;
    const cname = cmap.get(cid)?.name ?? "Unknown";
    const ref = inv.dueDate?.getTime() ?? inv.issueDate.getTime();
    const ageDays = Math.max(0, Math.floor((now - ref) / 86400000));
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
  // Aggregate sold quantities/revenue from invoice_items joined to invoices.
  const orgInvoices = await db
    .select({ id: invoicesTable.id })
    .from(invoicesTable)
    .where(and(eq(invoicesTable.organizationId, orgId), sql`${invoicesTable.status} <> 'cancelled'`));
  const invIds = orgInvoices.map((r) => r.id);
  if (invIds.length === 0) {
    respond(req, res, "top-items", [], "Top items");
    return;
  }
  const items = await db
    .select({
      description: invoiceItemsTable.description,
      qty: sql<string>`coalesce(sum(${invoiceItemsTable.quantity}),0)::text`,
      revenue: sql<string>`coalesce(sum(${invoiceItemsTable.totalPrice}),0)::text`,
    })
    .from(invoiceItemsTable)
    .where(inArray(invoiceItemsTable.invoiceId, invIds))
    .groupBy(invoiceItemsTable.description)
    .orderBy(sql`sum(${invoiceItemsTable.totalPrice}) desc`)
    .limit(20);
  respond(
    req,
    res,
    "top-items",
    items.map((i) => ({ name: i.description, quantity: Number(i.qty), revenue: Number(i.revenue) })),
    "Top items",
  );
});

reportsR4Router.get("/reports/lead-source-roi", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const rows = await db
    .select({
      source: leadsTable.source,
      total: sql<number>`count(*)::int`,
      won: sql<number>`count(*) filter (where ${leadsTable.status} = 'won')::int`,
      lost: sql<number>`count(*) filter (where ${leadsTable.status} = 'lost')::int`,
    })
    .from(leadsTable)
    .where(eq(leadsTable.organizationId, orgId))
    .groupBy(leadsTable.source);
  // Revenue per source: sum invoice amountPaid for clients converted from each source.
  const wonLeads = await db
    .select()
    .from(leadsTable)
    .where(and(eq(leadsTable.organizationId, orgId), eq(leadsTable.status, "won")));
  const clientIds = wonLeads.map((l) => l.convertedClientId).filter(Boolean) as number[];
  let invs: Array<{ clientId: number | null; amountPaid: unknown }> = [];
  if (clientIds.length) {
    invs = await db
      .select({ clientId: invoicesTable.clientId, amountPaid: invoicesTable.amountPaid })
      .from(invoicesTable)
      .where(and(eq(invoicesTable.organizationId, orgId), inArray(invoicesTable.clientId, clientIds)));
  }
  const revBySource = new Map<string, number>();
  for (const l of wonLeads) {
    const revFromClient = invs
      .filter((i) => i.clientId === l.convertedClientId)
      .reduce((s, i) => s + Number(i.amountPaid), 0);
    revBySource.set(l.source, (revBySource.get(l.source) ?? 0) + revFromClient);
  }
  respond(
    req,
    res,
    "lead-source-roi",
    rows.map((r) => ({
      source: r.source,
      total: Number(r.total),
      won: Number(r.won),
      lost: Number(r.lost),
      conversionPct: r.total > 0 ? Math.round((r.won / r.total) * 100) : 0,
      revenue: revBySource.get(r.source) ?? 0,
    })),
    "Lead source ROI",
  );
});

reportsR4Router.get("/reports/social-engagement", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const posts = await db
    .select()
    .from(socialPostsTable)
    .where(eq(socialPostsTable.organizationId, orgId));
  const results = await db
    .select()
    .from(socialPostResultsTable)
    .where(eq(socialPostResultsTable.organizationId, orgId));
  const byPost = new Map<number, typeof results>();
  for (const r of results) {
    const arr = byPost.get(r.postId) ?? [];
    arr.push(r);
    byPost.set(r.postId, arr);
  }
  const data = posts
    .filter((p) => p.status === "posted" || p.status === "partial")
    .map((p) => {
      const r = byPost.get(p.id) ?? [];
      const likes = r.reduce((s, x) => s + Number(x.metrics?.likes ?? 0), 0);
      const comments = r.reduce((s, x) => s + Number(x.metrics?.comments ?? 0), 0);
      const shares = r.reduce((s, x) => s + Number(x.metrics?.shares ?? 0), 0);
      const impressions = r.reduce((s, x) => s + Number(x.metrics?.impressions ?? 0), 0);
      return {
        id: p.id,
        content: p.content.slice(0, 60),
        platforms: (p.platforms ?? []).join(", "),
        publishedAt: p.publishedAt?.toISOString() ?? null,
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
  // Campaigns
  const campaigns = await db
    .select()
    .from(campaignsTable)
    .where(eq(campaignsTable.organizationId, orgId));
  const recs = await db.select().from(campaignRecipientsTable).where(eq(campaignRecipientsTable.organizationId, orgId));
  const data = campaigns.map((c) => {
    const r = recs.filter((x) => x.campaignId === c.id);
    const sent = r.filter((x) => x.status === "sent" || x.status === "opened" || x.status === "clicked").length;
    const opened = r.filter((x) => x.status === "opened" || x.status === "clicked").length;
    const clicked = r.filter((x) => x.status === "clicked").length;
    return {
      campaignId: c.id,
      name: c.name,
      subject: c.subject,
      sentAt: c.sentAt?.toISOString() ?? null,
      sent,
      opened,
      clicked,
      openRate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
      clickRate: sent > 0 ? Math.round((clicked / sent) * 100) : 0,
    };
  });
  // Direct emails (transactional)
  const [tot] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(emailsTable)
    .where(and(eq(emailsTable.organizationId, orgId), eq(emailsTable.direction, "outbound")));
  const [op] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(emailsTable)
    .where(and(eq(emailsTable.organizationId, orgId), eq(emailsTable.direction, "outbound"), eq(emailsTable.status, "opened")));
  respond(req, res, "email-performance", [
    ...data,
    {
      campaignId: 0,
      name: "(transactional)",
      subject: "All non-campaign sent emails",
      sentAt: null,
      sent: Number(tot?.c ?? 0),
      opened: Number(op?.c ?? 0),
      clicked: 0,
      openRate: Number(tot?.c ?? 0) > 0 ? Math.round((Number(op?.c ?? 0) / Number(tot?.c ?? 0)) * 100) : 0,
      clickRate: 0,
    },
  ], "Email performance");
});

// Index of available reports — used by the unified Reports page.
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

// Mark unused imports as used (avoids TS6133 if tree-shaken).
void paymentsTable;
void purchaseOrderItemsTable;
void itemsTable;
void quotationsTable;

export default reportsR4Router;
