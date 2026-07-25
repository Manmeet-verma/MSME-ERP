import { Router } from "express";
import { getDb } from "../lib/firebase";
import { requireAuth } from "../middlewares/auth";

const db = () => getDb();

const dashboardWidgetsRouter = Router();

dashboardWidgetsRouter.get("/dashboard/widgets", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [leadsSnap, callsSnap, emailsSnap, quotesSnap, invSnap, paySnap, tasksSnap, itemsSnap, stocksSnap, poSnap] =
    await Promise.all([
      db().collection("leads").where("organizationId", "==", orgId).get(),
      db().collection("calls").where("organizationId", "==", orgId).where("createdAt", ">=", weekAgo).get(),
      db().collection("emails").where("organizationId", "==", orgId).where("direction", "==", "outbound").where("createdAt", ">=", weekAgo).get(),
      db().collection("quotations").where("organizationId", "==", orgId).where("createdAt", ">=", weekAgo).get(),
      db().collection("invoices").where("organizationId", "==", orgId).get(),
      db().collection("payments").where("organizationId", "==", orgId).where("paidAt", ">=", monthStart).get(),
      db().collection("tasks").where("organizationId", "==", orgId).where("status", "==", "open").get(),
      db().collection("items").where("organizationId", "==", orgId).where("isActive", "==", true).get(),
      db().collection("stock_movements").where("organizationId", "==", orgId).get(),
      db().collection("purchase_orders").where("organizationId", "==", orgId).get(),
    ]);

  const allLeads = leadsSnap.docs.map((d) => d.data());
  const newLeadsToday = allLeads.filter((l) => (l.createdAt as string) >= startOfDay).length;
  const hotLeads = allLeads.filter((l) => l.priority === "hot").length;

  const callsThisWeek = callsSnap.size;
  const emailsSentThisWeek = emailsSnap.size;
  const quotationsSentThisWeek = quotesSnap.size;

  const allInvoices = invSnap.docs.map((d) => d.data());
  const invoicesUnpaid = allInvoices.filter((i) => i.status !== "paid" && i.status !== "cancelled" && i.status !== "draft").length;

  const revenueThisMonth = paySnap.docs.reduce((s, d) => s + Number(d.data().amount), 0);

  const overdueAmount = allInvoices
    .filter((i) => i.status === "overdue")
    .reduce((s, i) => s + (Number(i.total) - Number(i.amountPaid)), 0);

  const openTasks = tasksSnap.size;

  const items = itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
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

  const openPOs = poSnap.docs.filter((d) => ["draft", "sent", "partial"].includes(d.data().status)).length;

  res.json({
    newLeadsToday,
    hotLeads,
    callsThisWeek,
    emailsSentThisWeek,
    quotationsSentThisWeek,
    invoicesUnpaid,
    revenueThisMonth,
    overdueAmount,
    openTasks,
    lowStockItems,
    openPurchaseOrders: openPOs,
    stockValue,
  });
});

export default dashboardWidgetsRouter;
