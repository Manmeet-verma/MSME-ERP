import { Router } from "express";
import {
  db,
  leadsTable,
  callsTable,
  emailsTable,
  quotationsTable,
  invoicesTable,
  paymentsTable,
  tasksTable,
} from "@workspace/db";
import { and, eq, gte, sql, ne } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const dashboardWidgetsRouter = Router();

dashboardWidgetsRouter.get("/dashboard/widgets", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [newLeadsToday] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(leadsTable)
    .where(and(eq(leadsTable.organizationId, orgId), gte(leadsTable.createdAt, startOfDay)));
  const [hotLeads] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(leadsTable)
    .where(and(eq(leadsTable.organizationId, orgId), eq(leadsTable.priority, "hot")));
  const [callsThisWeek] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(callsTable)
    .where(and(eq(callsTable.organizationId, orgId), gte(callsTable.createdAt, weekAgo)));
  const [emailsSentThisWeek] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(emailsTable)
    .where(and(eq(emailsTable.organizationId, orgId), gte(emailsTable.createdAt, weekAgo), eq(emailsTable.direction, "outbound")));
  const [quotationsSentThisWeek] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(quotationsTable)
    .where(and(eq(quotationsTable.organizationId, orgId), gte(quotationsTable.createdAt, weekAgo)));
  const [invoicesUnpaid] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(invoicesTable)
    .where(
      and(
        eq(invoicesTable.organizationId, orgId),
        ne(invoicesTable.status, "paid"),
        ne(invoicesTable.status, "cancelled"),
        ne(invoicesTable.status, "draft"),
      ),
    );
  const [revenueRow] = await db
    .select({ s: sql<string>`coalesce(sum(${paymentsTable.amount}),0)::text` })
    .from(paymentsTable)
    .where(and(eq(paymentsTable.organizationId, orgId), gte(paymentsTable.paidAt, monthStart)));
  const [overdueRow] = await db
    .select({ s: sql<string>`coalesce(sum(${invoicesTable.total} - ${invoicesTable.amountPaid}),0)::text` })
    .from(invoicesTable)
    .where(and(eq(invoicesTable.organizationId, orgId), eq(invoicesTable.status, "overdue")));
  const [openTasks] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(tasksTable)
    .where(and(eq(tasksTable.organizationId, orgId), eq(tasksTable.status, "open")));

  res.json({
    newLeadsToday: Number(newLeadsToday?.c ?? 0),
    hotLeads: Number(hotLeads?.c ?? 0),
    callsThisWeek: Number(callsThisWeek?.c ?? 0),
    emailsSentThisWeek: Number(emailsSentThisWeek?.c ?? 0),
    quotationsSentThisWeek: Number(quotationsSentThisWeek?.c ?? 0),
    invoicesUnpaid: Number(invoicesUnpaid?.c ?? 0),
    revenueThisMonth: Number(revenueRow?.s ?? 0),
    overdueAmount: Number(overdueRow?.s ?? 0),
    openTasks: Number(openTasks?.c ?? 0),
  });
});

export default dashboardWidgetsRouter;
