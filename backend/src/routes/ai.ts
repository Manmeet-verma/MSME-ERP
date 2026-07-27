import { Router } from "express";
import { getDb } from "../lib/firebase";
import { requireAuth } from "../middlewares/auth";
import { aiDailyInsights, aiPlanNlSearch, type DashboardSnapshot, type NlSearchPlan } from "../lib/ai";

const db = () => getDb();

const aiRouter = Router();

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

aiRouter.get("/ai/insights", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const forDate = String(req.query.date ?? todayKey());
  // Cache hit?
  const cachedSnap = await db()
    .collection("ai_insights")
    .where("organizationId", "==", orgId)
    .where("forDate", "==", forDate)
    .limit(1)
    .get();
  if (!cachedSnap.empty && req.query.refresh !== "1") {
    const cached = cachedSnap.docs[0].data();
    let insightsBundle = cached.insights;
    if (typeof insightsBundle === "string") {
      try { insightsBundle = JSON.parse(insightsBundle); } catch { /* keep as-is */ }
    }
    res.json({
      forDate: cached.forDate,
      insights: insightsBundle && typeof insightsBundle === "object" && insightsBundle.headline ? insightsBundle : null,
      metricsSnapshot: cached.metricsSnapshot,
      cached: true,
    });
    return;
  }
  // Build snapshot
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Leads
  const leadsSnap = await db().collection("leads").where("organizationId", "==", orgId).get();
  const allLeads = leadsSnap.docs.map((d) => d.data());
  const newLeadsToday = allLeads.filter((l) => (l.createdAt as string) >= startOfDay).length;
  const hotLeads = allLeads.filter((l) => l.priority === "hot").length;

  // Invoices
  const invSnap = await db().collection("invoices").where("organizationId", "==", orgId).get();
  const allInvoices = invSnap.docs.map((d) => d.data());
  const invoicesUnpaid = allInvoices.filter((i) => !["paid", "cancelled", "draft"].includes(i.status)).length;
  const overdueAmount = allInvoices
    .filter((i) => i.status === "overdue")
    .reduce((s, i) => s + (Number(i.total) - Number(i.amountPaid)), 0);

  // Tasks
  const tasksSnap = await db().collection("tasks").where("organizationId", "==", orgId).get();
  const openTasks = tasksSnap.docs.filter((d) => d.data().status === "open").length;

  // Quotations
  const quotesSnap = await db().collection("quotations").where("organizationId", "==", orgId).get();
  const quotesWeek = quotesSnap.docs.filter((d) => (d.data().createdAt as string) >= weekAgo).length;

  // Revenue (invoices updated this month)
  const revenueThisMonth = allInvoices
    .filter((i) => (i.updatedAt as string) >= monthStart)
    .reduce((s, i) => s + Number(i.amountPaid), 0);

  // Stock
  const itemsSnap = await db().collection("items").where("organizationId", "==", orgId).where("isActive", "==", true).get();
  const items = itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const stocksSnap = await db().collection("stock_movements").where("organizationId", "==", orgId).get();
  const stockMovements = stocksSnap.docs.map((d) => d.data());
  const stockMap = new Map<string, number>();
  for (const s of stockMovements) {
    const itemId = s.itemId as string;
    const current = stockMap.get(itemId) ?? 0;
    stockMap.set(itemId, current + (s.direction === "in" ? Number(s.quantity) : -Number(s.quantity)));
  }
  let lowStockItems = 0;
  let stockValue = 0;
  for (const i of items) {
    const q = stockMap.get(i.id) ?? 0;
    const thr = Number(i.lowStockThreshold);
    if (thr > 0 && q <= thr) lowStockItems += 1;
    if (q > 0) stockValue += q * Number(i.avgCost);
  }

  // Lead source breakdown
  const sourceMap = new Map<string, { total: number; won: number }>();
  for (const l of allLeads) {
    const src = l.source as string;
    const entry = sourceMap.get(src) ?? { total: 0, won: 0 };
    entry.total += 1;
    if (l.status === "won") entry.won += 1;
    sourceMap.set(src, entry);
  }
  let topSource = "";
  let topConv = 0;
  for (const [src, entry] of sourceMap) {
    const conv = entry.total > 0 ? (entry.won / entry.total) * 100 : 0;
    if (conv > topConv) {
      topConv = conv;
      topSource = src;
    }
  }

  const snap: DashboardSnapshot = {
    newLeadsToday,
    hotLeads,
    callsThisWeek: 0,
    emailsSentThisWeek: 0,
    quotationsSentThisWeek: quotesWeek,
    invoicesUnpaid,
    revenueThisMonth,
    overdueAmount,
    openTasks,
    lowStockItems,
    openPurchaseOrders: 0,
    stockValue,
    topLeadSource: topSource || undefined,
    topLeadSourceConversion: Math.round(topConv),
  };

  const insights = await aiDailyInsights(snap);
  // Upsert: check existing
  const existingSnap = await db()
    .collection("ai_insights")
    .where("organizationId", "==", orgId)
    .where("forDate", "==", forDate)
    .limit(1)
    .get();
  let row: Record<string, unknown>;
  if (!existingSnap.empty) {
    const doc = existingSnap.docs[0];
    await doc.ref.update({ insights, metricsSnapshot: snap as unknown as Record<string, number>, createdAt: new Date().toISOString() });
    const updated = await doc.ref.get();
    row = { id: updated.id, ...updated.data() };
  } else {
    const ref = await db().collection("ai_insights").add({
      organizationId: orgId,
      forDate,
      insights,
      metricsSnapshot: snap as unknown as Record<string, number>,
      createdAt: new Date().toISOString(),
    });
    const s = await ref.get();
    row = { id: s.id, ...s.data() };
  }
  res.json({
    forDate: row.forDate,
    insights: row.insights && typeof row.insights === "object" && row.insights.headline ? row.insights : null,
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
      const snap = await db().collection("invoices").where("organizationId", "==", orgId).limit(200).get();
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rows.sort((a, b) => ((b.createdAt as string) ?? "").localeCompare((a.createdAt as string) ?? ""));
      results = rows
        .filter((r) => (plan.filters.status ? r.status === plan.filters.status : true))
        .filter((r) => (plan.filters.minTotal ? Number(r.total) >= Number(plan.filters.minTotal) : true))
        .filter((r) => (plan.filters.maxTotal ? Number(r.total) <= Number(plan.filters.maxTotal) : true))
        .filter((r) => (plan.filters.overdueOnly ? r.status === "overdue" : true))
        .filter((r) => (plan.filters.clientId ? r.clientId === plan.filters.clientId : true))
        .slice(0, limit)
        .map((r) => ({
          id: r.id,
          invoiceNumber: r.invoiceNumber,
          status: r.status,
          total: Number(r.total),
          amountPaid: Number(r.amountPaid),
          dueAt: (r.dueDate as string) ?? null,
          link: `/invoices/${r.id}`,
        }));
    } else if (plan.entity === "leads") {
      const snap = await db().collection("leads").where("organizationId", "==", orgId).limit(200).get();
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rows.sort((a, b) => ((b.createdAt as string) ?? "").localeCompare((a.createdAt as string) ?? ""));
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
      const snap = await db().collection("clients").where("organizationId", "==", orgId).limit(200).get();
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rows.sort((a, b) => ((b.createdAt as string) ?? "").localeCompare((a.createdAt as string) ?? ""));
      results = rows
        .filter((r) => (plan.filters.state ? r.state === plan.filters.state : true))
        .slice(0, limit)
        .map((r) => ({ id: r.id, name: r.name, company: r.company, email: r.email, link: `/clients` }));
    } else if (plan.entity === "quotations") {
      const snap = await db().collection("quotations").where("organizationId", "==", orgId).limit(200).get();
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rows.sort((a, b) => ((b.createdAt as string) ?? "").localeCompare((a.createdAt as string) ?? ""));
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
      const snap = await db().collection("tasks").where("organizationId", "==", orgId).limit(200).get();
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rows.sort((a, b) => ((b.createdAt as string) ?? "").localeCompare((a.createdAt as string) ?? ""));
      results = rows
        .filter((r) => (plan.filters.status ? r.status === plan.filters.status : true))
        .filter((r) => (plan.filters.priority ? r.priority === plan.filters.priority : true))
        .slice(0, limit)
        .map((r) => ({ id: r.id, title: r.title, status: r.status, priority: r.priority, link: `/tasks` }));
    } else if (plan.entity === "items") {
      const snap = await db().collection("items").where("organizationId", "==", orgId).limit(200).get();
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const stocksAllSnap = await db().collection("stock_movements").where("organizationId", "==", orgId).get();
      const stockMovements = stocksAllSnap.docs.map((d) => d.data());
      const m = new Map<string, number>();
      for (const s of stockMovements) {
        const itemId = s.itemId as string;
        const current = m.get(itemId) ?? 0;
        m.set(itemId, current + (s.direction === "in" ? Number(s.quantity) : -Number(s.quantity)));
      }
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
