import { Router } from "express";
import {
  db,
  aiInsightsTable,
  invoicesTable,
  leadsTable,
  clientsTable,
  quotationsTable,
  tasksTable,
  itemsTable,
  stockMovementsTable,
} from "@workspace/db";
import { and, eq, sql, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { aiDailyInsights, aiPlanNlSearch, type DashboardSnapshot, type NlSearchPlan } from "../lib/ai";

const aiRouter = Router();

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

aiRouter.get("/ai/insights", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const forDate = String(req.query.date ?? todayKey());
  // Cache hit?
  const [cached] = await db
    .select()
    .from(aiInsightsTable)
    .where(and(eq(aiInsightsTable.organizationId, orgId), eq(aiInsightsTable.forDate, forDate)));
  if (cached && req.query.refresh !== "1") {
    res.json({
      forDate: cached.forDate,
      insights: cached.insights,
      metricsSnapshot: cached.metricsSnapshot,
      cached: true,
    });
    return;
  }
  // Build snapshot
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  async function countWhere(table: { organizationId: typeof leadsTable.organizationId }, conds: ReturnType<typeof eq>) {
    const [r] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(table as unknown as typeof leadsTable)
      .where(conds);
    return Number(r?.c ?? 0);
  }

  const [newLeadsToday] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(leadsTable)
    .where(and(eq(leadsTable.organizationId, orgId), sql`${leadsTable.createdAt} >= ${startOfDay}`));
  const [hotLeads] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(leadsTable)
    .where(and(eq(leadsTable.organizationId, orgId), eq(leadsTable.priority, "hot")));
  const [invoicesUnpaid] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(invoicesTable)
    .where(and(eq(invoicesTable.organizationId, orgId), sql`${invoicesTable.status} not in ('paid','cancelled','draft')`));
  const [overdueRow] = await db
    .select({ s: sql<string>`coalesce(sum(${invoicesTable.total} - ${invoicesTable.amountPaid}),0)::text` })
    .from(invoicesTable)
    .where(and(eq(invoicesTable.organizationId, orgId), eq(invoicesTable.status, "overdue")));
  const [openTasks] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(tasksTable)
    .where(and(eq(tasksTable.organizationId, orgId), eq(tasksTable.status, "open")));
  const [quotesWeek] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(quotationsTable)
    .where(and(eq(quotationsTable.organizationId, orgId), sql`${quotationsTable.createdAt} >= ${weekAgo}`));
  const [revRow] = await db
    .select({ s: sql<string>`coalesce(sum(${invoicesTable.amountPaid}),0)::text` })
    .from(invoicesTable)
    .where(and(eq(invoicesTable.organizationId, orgId), sql`${invoicesTable.updatedAt} >= ${monthStart}`));

  // Stock
  const items = await db
    .select()
    .from(itemsTable)
    .where(and(eq(itemsTable.organizationId, orgId), eq(itemsTable.isActive, true)));
  const stocks = await db
    .select({
      itemId: stockMovementsTable.itemId,
      qty: sql<string>`coalesce(sum(case when ${stockMovementsTable.direction} = 'in' then ${stockMovementsTable.quantity} else -${stockMovementsTable.quantity} end),0)::text`,
    })
    .from(stockMovementsTable)
    .where(eq(stockMovementsTable.organizationId, orgId))
    .groupBy(stockMovementsTable.itemId);
  const stockMap = new Map(stocks.map((s) => [s.itemId, Number(s.qty)]));
  let lowStockItems = 0;
  let stockValue = 0;
  for (const i of items) {
    const q = stockMap.get(i.id) ?? 0;
    const thr = Number(i.lowStockThreshold);
    if (thr > 0 && q <= thr) lowStockItems += 1;
    if (q > 0) stockValue += q * Number(i.avgCost);
  }

  // Lead source breakdown
  const sourceRows = await db
    .select({
      source: leadsTable.source,
      total: sql<number>`count(*)::int`,
      won: sql<number>`count(*) filter (where ${leadsTable.status} = 'won')::int`,
    })
    .from(leadsTable)
    .where(eq(leadsTable.organizationId, orgId))
    .groupBy(leadsTable.source);
  let topSource = "";
  let topConv = 0;
  for (const s of sourceRows) {
    const conv = s.total > 0 ? (s.won / s.total) * 100 : 0;
    if (conv > topConv) {
      topConv = conv;
      topSource = s.source;
    }
  }

  const snap: DashboardSnapshot = {
    newLeadsToday: Number(newLeadsToday?.c ?? 0),
    hotLeads: Number(hotLeads?.c ?? 0),
    callsThisWeek: 0,
    emailsSentThisWeek: 0,
    quotationsSentThisWeek: Number(quotesWeek?.c ?? 0),
    invoicesUnpaid: Number(invoicesUnpaid?.c ?? 0),
    revenueThisMonth: Number(revRow?.s ?? 0),
    overdueAmount: Number(overdueRow?.s ?? 0),
    openTasks: Number(openTasks?.c ?? 0),
    lowStockItems,
    openPurchaseOrders: 0,
    stockValue,
    topLeadSource: topSource || undefined,
    topLeadSourceConversion: Math.round(topConv),
  };

  const insights = await aiDailyInsights(snap);
  const [row] = await db
    .insert(aiInsightsTable)
    .values({
      organizationId: orgId,
      forDate,
      insights,
      metricsSnapshot: snap as unknown as Record<string, number>,
    })
    .onConflictDoUpdate({
      target: [aiInsightsTable.organizationId, aiInsightsTable.forDate],
      set: { insights, metricsSnapshot: snap as unknown as Record<string, number>, createdAt: new Date() },
    })
    .returning();
  res.json({
    forDate: row.forDate,
    insights: row.insights,
    metricsSnapshot: row.metricsSnapshot,
    cached: false,
  });
});

// Natural-language search
aiRouter.post("/ai/nl-search", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const q = String(req.body?.query ?? "").trim();
  if (!q) {
    res.status(400).json({ error: "query required" });
    return;
  }
  const plan: NlSearchPlan = await aiPlanNlSearch(q);
  let results: Array<Record<string, unknown>> = [];
  const limit = 25;
  try {
    if (plan.entity === "invoices") {
      const rows = await db
        .select()
        .from(invoicesTable)
        .where(eq(invoicesTable.organizationId, orgId))
        .orderBy(desc(invoicesTable.createdAt))
        .limit(200);
      results = rows
        .filter((r) => (plan.filters.status ? r.status === plan.filters.status : true))
        .filter((r) => (plan.filters.minTotal ? Number(r.total) >= Number(plan.filters.minTotal) : true))
        .filter((r) => (plan.filters.maxTotal ? Number(r.total) <= Number(plan.filters.maxTotal) : true))
        .filter((r) => (plan.filters.overdueOnly ? r.status === "overdue" : true))
        .filter((r) => (plan.filters.clientId ? r.clientId === Number(plan.filters.clientId) : true))
        .slice(0, limit)
        .map((r) => ({
          id: r.id,
          invoiceNumber: r.invoiceNumber,
          status: r.status,
          total: Number(r.total),
          amountPaid: Number(r.amountPaid),
          dueAt: r.dueDate?.toISOString() ?? null,
          link: `/invoices/${r.id}`,
        }));
    } else if (plan.entity === "leads") {
      const rows = await db
        .select()
        .from(leadsTable)
        .where(eq(leadsTable.organizationId, orgId))
        .orderBy(desc(leadsTable.createdAt))
        .limit(200);
      results = rows
        .filter((r) => (plan.filters.status ? r.status === plan.filters.status : true))
        .filter((r) => (plan.filters.priority ? r.priority === plan.filters.priority : true))
        .filter((r) => (plan.filters.source ? r.source === plan.filters.source : true))
        .slice(0, limit)
        .map((r) => ({
          id: r.id,
          name: r.name,
          company: r.company,
          priority: r.priority,
          status: r.status,
          source: r.source,
          link: `/leads/${r.id}`,
        }));
    } else if (plan.entity === "clients") {
      const rows = await db
        .select()
        .from(clientsTable)
        .where(eq(clientsTable.organizationId, orgId))
        .orderBy(desc(clientsTable.createdAt))
        .limit(200);
      results = rows
        .filter((r) => (plan.filters.state ? r.state === plan.filters.state : true))
        .slice(0, limit)
        .map((r) => ({ id: r.id, name: r.name, company: r.company, email: r.email, link: `/clients` }));
    } else if (plan.entity === "quotations") {
      const rows = await db
        .select()
        .from(quotationsTable)
        .where(eq(quotationsTable.organizationId, orgId))
        .orderBy(desc(quotationsTable.createdAt))
        .limit(200);
      results = rows
        .filter((r) => (plan.filters.status ? r.status === plan.filters.status : true))
        .filter((r) => (plan.filters.minTotal ? Number(r.total) >= Number(plan.filters.minTotal) : true))
        .filter((r) => (plan.filters.maxTotal ? Number(r.total) <= Number(plan.filters.maxTotal) : true))
        .slice(0, limit)
        .map((r) => ({
          id: r.id,
          quotationNumber: r.quotationNumber,
          status: r.status,
          total: Number(r.total),
          link: `/quotations/${r.id}`,
        }));
    } else if (plan.entity === "tasks") {
      const rows = await db
        .select()
        .from(tasksTable)
        .where(eq(tasksTable.organizationId, orgId))
        .orderBy(desc(tasksTable.createdAt))
        .limit(200);
      results = rows
        .filter((r) => (plan.filters.status ? r.status === plan.filters.status : true))
        .filter((r) => (plan.filters.priority ? r.priority === plan.filters.priority : true))
        .slice(0, limit)
        .map((r) => ({ id: r.id, title: r.title, status: r.status, priority: r.priority, link: `/tasks` }));
    } else if (plan.entity === "items") {
      const rows = await db
        .select()
        .from(itemsTable)
        .where(eq(itemsTable.organizationId, orgId))
        .limit(200);
      const stocksAll = await db
        .select({
          itemId: stockMovementsTable.itemId,
          qty: sql<string>`coalesce(sum(case when ${stockMovementsTable.direction} = 'in' then ${stockMovementsTable.quantity} else -${stockMovementsTable.quantity} end),0)::text`,
        })
        .from(stockMovementsTable)
        .where(eq(stockMovementsTable.organizationId, orgId))
        .groupBy(stockMovementsTable.itemId);
      const m = new Map(stocksAll.map((s) => [s.itemId, Number(s.qty)]));
      results = rows
        .filter((r) => (plan.filters.category ? r.category === plan.filters.category : true))
        .filter((r) => {
          if (!plan.filters.lowStock) return true;
          const q = m.get(r.id) ?? 0;
          return q <= Number(r.lowStockThreshold);
        })
        .slice(0, limit)
        .map((r) => ({ id: r.id, name: r.name, sku: r.sku, stock: m.get(r.id) ?? 0, link: `/items` }));
    }
  } catch (e) {
    res.status(500).json({ error: "Search failed: " + (e as Error).message });
    return;
  }
  res.json({ plan, results });
});

export default aiRouter;
