import { Router } from "express";
import { getDb } from "../lib/firebase";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const db = () => getDb();

const reportsRouter = Router();

reportsRouter.get("/reports/dashboard", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;

  // Fetch all data
  const quotationsSnap = await db().collection("quotations").where("organizationId", "==", orgId).get();
  const allQ = quotationsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const clientsSnap = await db().collection("clients").where("organizationId", "==", orgId).get();
  const productsSnap = await db().collection("products").where("organizationId", "==", orgId).get();

  const totalQ = allQ.length;
  const totalC = clientsSnap.size;
  const totalP = productsSnap.size;

  // Status breakdown
  const statusMap = new Map<string, { count: number; value: number }>();
  for (const q of allQ) {
    const st = q.status as string;
    const entry = statusMap.get(st) ?? { count: 0, value: 0 };
    entry.count += 1;
    entry.value += Number(q.total ?? 0);
    statusMap.set(st, entry);
  }

  const pipelineStatuses = ["draft", "sent"];
  const pipelineValue = Array.from(statusMap.entries())
    .filter(([s]) => pipelineStatuses.includes(s))
    .reduce((acc, [, v]) => acc + v.value, 0);
  const approvedValue = statusMap.get("approved")?.value ?? 0;
  const totalApproved = statusMap.get("approved")?.count ?? 0;
  const conversionRate = totalQ > 0 ? Math.round((totalApproved / totalQ) * 100) : 0;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthlyQ = allQ.filter((q) => (q.createdAt as string) >= startOfMonth);
  const monthlyQCount = monthlyQ.length;
  const monthlyQValue = monthlyQ.reduce((s, q) => s + Number(q.total ?? 0), 0);

  // Recent quotations
  allQ.sort((a, b) => ((b.createdAt as string) ?? "").localeCompare((a.createdAt as string) ?? ""));
  const recentRows = allQ.slice(0, 5);
  const recent = await Promise.all(
    recentRows.map(async (q) => {
      let client = null;
      if (q.clientId) {
        const cSnap = await db().collection("clients").doc(q.clientId as string).get();
        if (cSnap.exists) client = cSnap.data();
      }
      let creator = null;
      if (q.createdById) {
        const uSnap = await db().collection("users").doc(q.createdById as string).get();
        if (uSnap.exists) creator = uSnap.data();
      }
      const itemsSnap = await db().collection("quotation_items").where("quotationId", "==", q.id).get();
      return {
        id: q.id,
        quotationNumber: q.quotationNumber,
        clientId: (q.clientId as string) ?? null,
        clientName: client?.name ?? null,
        clientCompany: client?.company ?? null,
        createdByName: creator?.name ?? null,
        status: q.status,
        validUntil: (q.validUntil as string) ?? null,
        subtotal: Number(q.subtotal),
        discountAmount: Number(q.discountAmount),
        discountPercent: Number(q.discountPercent),
        taxAmount: Number(q.taxAmount),
        taxPercent: Number(q.taxPercent),
        total: Number(q.total),
        notes: (q.notes as string) ?? null,
        terms: (q.terms as string) ?? null,
        itemCount: itemsSnap.size,
        createdAt: q.createdAt as string,
        updatedAt: q.updatedAt as string,
      };
    }),
  );

  res.json({
    totalQuotations: totalQ,
    totalClients: totalC,
    totalProducts: totalP,
    pipelineValue,
    approvedValue,
    conversionRate,
    thisMonthQuotations: monthlyQCount,
    thisMonthValue: monthlyQValue,
    draftCount: statusMap.get("draft")?.count ?? 0,
    sentCount: statusMap.get("sent")?.count ?? 0,
    approvedCount: statusMap.get("approved")?.count ?? 0,
    rejectedCount: statusMap.get("rejected")?.count ?? 0,
    expiredCount: statusMap.get("expired")?.count ?? 0,
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
  const quotationsSnap = await db().collection("quotations").where("organizationId", "==", orgId).get();
  const allQ = quotationsSnap.docs.map((d) => d.data());
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
    const all = allQ.filter((q) => (q.createdAt as string) >= start && (q.createdAt as string) < end);
    const approved = all.filter((q) => q.status === "approved");
    const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    months.push({
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
      quotationCount: all.length,
      totalValue: all.reduce((s, q) => s + Number(q.total ?? 0), 0),
      approvedValue: approved.reduce((s, q) => s + Number(q.total ?? 0), 0),
      approvedCount: approved.length,
    });
  }
  res.json(months);
});

reportsRouter.get("/reports/top-products", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  // Get quotations for this org
  const quotationsSnap = await db().collection("quotations").where("organizationId", "==", orgId).get();
  const quotIds = new Set(quotationsSnap.docs.map((d) => d.id));
  // Get quotation items that belong to these quotations
  const qiSnap = await db().collection("quotation_items").get();
  const qiRows = qiSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((r) => quotIds.has(r.quotationId as string) && r.productId);
  // Group by productId
  const productMap = new Map<string, { count: number; totalRevenue: number }>();
  for (const r of qiRows) {
    const pid = r.productId as string;
    const entry = productMap.get(pid) ?? { count: 0, totalRevenue: 0 };
    entry.count += 1;
    entry.totalRevenue += Number(r.totalPrice ?? 0);
    productMap.set(pid, entry);
  }
  const sorted = Array.from(productMap.entries())
    .map(([productId, v]) => ({ productId, ...v }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 10);
  // Get product names
  const nameMap = new Map<string, string>();
  for (const { productId } of sorted) {
    const pSnap = await db().collection("products").doc(productId).get();
    if (pSnap.exists) nameMap.set(productId, pSnap.data()!.name as string);
  }
  res.json(
    sorted.map((r) => ({
      productId: r.productId,
      productName: nameMap.get(r.productId) ?? "Unknown",
      count: r.count,
      totalRevenue: r.totalRevenue,
    })),
  );
});

reportsRouter.get("/reports/pipeline", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const quotationsSnap = await db().collection("quotations").where("organizationId", "==", orgId).get();
  const allQ = quotationsSnap.docs.map((d) => d.data());
  const statusMap = new Map<string, { count: number; totalValue: number }>();
  for (const q of allQ) {
    const st = q.status as string;
    const entry = statusMap.get(st) ?? { count: 0, totalValue: 0 };
    entry.count += 1;
    entry.totalValue += Number(q.total ?? 0);
    statusMap.set(st, entry);
  }
  res.json(
    Array.from(statusMap.entries()).map(([status, v]) => ({
      status,
      count: v.count,
      totalValue: v.totalValue,
    })),
  );
});

reportsRouter.get("/audit-logs", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user!.organizationId;
  const limit = Number(req.query.limit ?? 50);
  const offset = Number(req.query.offset ?? 0);
  const snap = await db().collection("audit_logs").where("organizationId", "==", orgId).get();
  const allLogs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  allLogs.sort((a, b) => ((b.createdAt as string) ?? "").localeCompare((a.createdAt as string) ?? ""));
  const logs = allLogs.slice(offset, offset + limit);
  const userIds = [...new Set(logs.map((l) => l.userId).filter(Boolean))] as string[];
  const userMap = new Map<string, string>();
  for (const uid of userIds) {
    const uSnap = await db().collection("users").doc(uid).get();
    if (uSnap.exists) userMap.set(uid, uSnap.data()!.name as string);
  }
  res.json(
    logs.map((l) => ({
      id: l.id,
      userId: (l.userId as string) ?? null,
      userName: l.userId ? userMap.get(l.userId as string) ?? null : null,
      action: l.action,
      entity: l.entity,
      entityId: (l.entityId as string) ?? null,
      details: (l.details as Record<string, unknown>) ?? null,
      ipAddress: (l.ipAddress as string) ?? null,
      createdAt: l.createdAt as string,
    })),
  );
});

export default reportsRouter;
