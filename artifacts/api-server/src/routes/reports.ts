import { Router } from "express";
import {
  db,
  quotationsTable,
  clientsTable,
  productsTable,
  auditLogsTable,
  usersTable,
  quotationItemsTable,
} from "@workspace/db";
import { eq, count, sum, sql, and, gte, lt } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const reportsRouter = Router();

reportsRouter.get("/reports/dashboard", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const [totalQ] = await db
    .select({ count: count() })
    .from(quotationsTable)
    .where(eq(quotationsTable.organizationId, orgId));
  const [totalC] = await db
    .select({ count: count() })
    .from(clientsTable)
    .where(eq(clientsTable.organizationId, orgId));
  const [totalP] = await db
    .select({ count: count() })
    .from(productsTable)
    .where(eq(productsTable.organizationId, orgId));

  const statusBreakdown = await db
    .select({ status: quotationsTable.status, count: count(), value: sum(quotationsTable.total) })
    .from(quotationsTable)
    .where(eq(quotationsTable.organizationId, orgId))
    .groupBy(quotationsTable.status);
  const statusMap = new Map(statusBreakdown.map((s) => [s.status, s]));

  const pipelineStatuses = ["draft", "sent"];
  const pipelineValue = statusBreakdown
    .filter((s) => pipelineStatuses.includes(s.status))
    .reduce((acc, s) => acc + Number(s.value ?? 0), 0);
  const approvedValue = Number(statusMap.get("approved")?.value ?? 0);
  const totalApproved = Number(statusMap.get("approved")?.count ?? 0);
  const totalAll = Number(totalQ?.count ?? 0);
  const conversionRate = totalAll > 0 ? Math.round((totalApproved / totalAll) * 100) : 0;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const [monthlyQ] = await db
    .select({ count: count(), value: sum(quotationsTable.total) })
    .from(quotationsTable)
    .where(and(eq(quotationsTable.organizationId, orgId), gte(quotationsTable.createdAt, startOfMonth)));

  const recentRows = await db
    .select()
    .from(quotationsTable)
    .where(eq(quotationsTable.organizationId, orgId))
    .orderBy(sql`${quotationsTable.createdAt} DESC`)
    .limit(5);
  const recent = await Promise.all(
    recentRows.map(async (q) => {
      const client = q.clientId
        ? (await db.select().from(clientsTable).where(eq(clientsTable.id, q.clientId)))[0]
        : null;
      const creator = q.createdById
        ? (await db.select().from(usersTable).where(eq(usersTable.id, q.createdById)))[0]
        : null;
      const [itemCount] = await db
        .select({ count: count() })
        .from(quotationItemsTable)
        .where(eq(quotationItemsTable.quotationId, q.id));
      return {
        id: q.id,
        quotationNumber: q.quotationNumber,
        clientId: q.clientId ?? null,
        clientName: client?.name ?? null,
        clientCompany: client?.company ?? null,
        createdByName: creator?.name ?? null,
        status: q.status,
        validUntil: q.validUntil?.toISOString() ?? null,
        subtotal: Number(q.subtotal),
        discountAmount: Number(q.discountAmount),
        discountPercent: Number(q.discountPercent),
        taxAmount: Number(q.taxAmount),
        taxPercent: Number(q.taxPercent),
        total: Number(q.total),
        notes: q.notes ?? null,
        terms: q.terms ?? null,
        itemCount: Number(itemCount?.count ?? 0),
        createdAt: q.createdAt.toISOString(),
        updatedAt: q.updatedAt.toISOString(),
      };
    }),
  );

  res.json({
    totalQuotations: Number(totalQ?.count ?? 0),
    totalClients: Number(totalC?.count ?? 0),
    totalProducts: Number(totalP?.count ?? 0),
    pipelineValue,
    approvedValue,
    conversionRate,
    thisMonthQuotations: Number(monthlyQ?.count ?? 0),
    thisMonthValue: Number(monthlyQ?.value ?? 0),
    draftCount: Number(statusMap.get("draft")?.count ?? 0),
    sentCount: Number(statusMap.get("sent")?.count ?? 0),
    approvedCount: Number(statusMap.get("approved")?.count ?? 0),
    rejectedCount: Number(statusMap.get("rejected")?.count ?? 0),
    expiredCount: Number(statusMap.get("expired")?.count ?? 0),
    recentQuotations: recent,
  });
});

reportsRouter.get("/reports/monthly", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const months: Array<{
    month: number;
    year: number;
    label: string;
    quotationCount: number;
    totalValue: number;
    approvedValue: number;
    approvedCount: number;
  }> = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const [all] = await db
      .select({ count: count(), value: sum(quotationsTable.total) })
      .from(quotationsTable)
      .where(
        and(
          eq(quotationsTable.organizationId, orgId),
          gte(quotationsTable.createdAt, start),
          lt(quotationsTable.createdAt, end),
        ),
      );
    const [approved] = await db
      .select({ count: count(), value: sum(quotationsTable.total) })
      .from(quotationsTable)
      .where(
        and(
          eq(quotationsTable.organizationId, orgId),
          gte(quotationsTable.createdAt, start),
          lt(quotationsTable.createdAt, end),
          eq(quotationsTable.status, "approved"),
        ),
      );
    const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    months.push({
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
      quotationCount: Number(all?.count ?? 0),
      totalValue: Number(all?.value ?? 0),
      approvedValue: Number(approved?.value ?? 0),
      approvedCount: Number(approved?.count ?? 0),
    });
  }
  res.json(months);
});

reportsRouter.get("/reports/top-products", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const rows = await db
    .select({
      productId: quotationItemsTable.productId,
      count: count(),
      totalRevenue: sum(quotationItemsTable.totalPrice),
    })
    .from(quotationItemsTable)
    .innerJoin(quotationsTable, eq(quotationsTable.id, quotationItemsTable.quotationId))
    .where(and(eq(quotationsTable.organizationId, orgId), sql`${quotationItemsTable.productId} IS NOT NULL`))
    .groupBy(quotationItemsTable.productId)
    .orderBy(sql`SUM(${quotationItemsTable.totalPrice}) DESC`)
    .limit(10);
  const productIds = rows.map((r) => r.productId).filter(Boolean) as number[];
  const products =
    productIds.length > 0
      ? await db
          .select()
          .from(productsTable)
          .where(sql`${productsTable.id} = ANY(ARRAY[${sql.raw(productIds.join(","))}])`)
      : [];
  const productMap = new Map(products.map((p) => [p.id, p.name]));
  res.json(
    rows.map((r) => ({
      productId: r.productId!,
      productName: productMap.get(r.productId!) ?? "Unknown",
      count: Number(r.count),
      totalRevenue: Number(r.totalRevenue ?? 0),
    })),
  );
});

reportsRouter.get("/reports/pipeline", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const rows = await db
    .select({ status: quotationsTable.status, count: count(), totalValue: sum(quotationsTable.total) })
    .from(quotationsTable)
    .where(eq(quotationsTable.organizationId, orgId))
    .groupBy(quotationsTable.status);
  res.json(
    rows.map((r) => ({
      status: r.status,
      count: Number(r.count),
      totalValue: Number(r.totalValue ?? 0),
    })),
  );
});

reportsRouter.get("/audit-logs", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user!.organizationId;
  const limit = Number(req.query.limit ?? 50);
  const offset = Number(req.query.offset ?? 0);
  const logs = await db
    .select()
    .from(auditLogsTable)
    .where(eq(auditLogsTable.organizationId, orgId))
    .orderBy(sql`${auditLogsTable.createdAt} DESC`)
    .limit(limit)
    .offset(offset);
  const userIds = [...new Set(logs.map((l) => l.userId).filter(Boolean))] as number[];
  const users =
    userIds.length > 0
      ? await db
          .select()
          .from(usersTable)
          .where(sql`${usersTable.id} = ANY(ARRAY[${sql.raw(userIds.join(","))}])`)
      : [];
  const userMap = new Map(users.map((u) => [u.id, u.name]));
  res.json(
    logs.map((l) => ({
      id: l.id,
      userId: l.userId ?? null,
      userName: l.userId ? userMap.get(l.userId) ?? null : null,
      action: l.action,
      entity: l.entity,
      entityId: l.entityId ?? null,
      details: l.details ?? null,
      ipAddress: l.ipAddress ?? null,
      createdAt: l.createdAt.toISOString(),
    })),
  );
});

export default reportsRouter;
