import { db, leadsTable, invoicesTable, tasksTable, pushTokensTable } from "@workspace/db";
import { and, eq, gte, lte, isNotNull, sql } from "drizzle-orm";
import { sendPushToTokens } from "./push";
import { logger } from "./logger";

// Track which entity ids we've already notified about per tick to avoid spam.
// Keyed by `${type}:${orgId}:${entityId}`. In-memory is fine for a single-process server.
const notifiedHotLeads = new Set<string>();
const notifiedOverdueInvoices = new Set<string>();
const notifiedDueTasks = new Set<string>();

async function tokensForOrg(orgId: number): Promise<string[]> {
  const rows = await db
    .select({ token: pushTokensTable.token })
    .from(pushTokensTable)
    .where(eq(pushTokensTable.organizationId, orgId));
  return rows.map((r) => r.token);
}

export async function notifyHotLeads(): Promise<number> {
  // Hot leads created in the last 10 minutes that we haven't notified about yet.
  const since = new Date(Date.now() - 10 * 60_000);
  const rows = await db
    .select()
    .from(leadsTable)
    .where(and(eq(leadsTable.priority, "hot"), gte(leadsTable.createdAt, since)));
  let total = 0;
  for (const lead of rows) {
    const key = `hot:${lead.organizationId}:${lead.id}`;
    if (notifiedHotLeads.has(key)) continue;
    notifiedHotLeads.add(key);
    const tokens = await tokensForOrg(lead.organizationId);
    if (tokens.length === 0) continue;
    const r = await sendPushToTokens(tokens, {
      title: "🔥 Hot lead",
      body: `${lead.name}${lead.company ? ` · ${lead.company}` : ""}${lead.product ? ` · ${lead.product}` : ""}`,
      data: { type: "lead", leadId: lead.id },
    });
    total += r.sent;
  }
  return total;
}

export async function notifyOverdueInvoices(): Promise<number> {
  // Invoices that just rolled into overdue (status === overdue, dueDate in last 24h).
  const since = new Date(Date.now() - 86_400_000);
  const rows = await db
    .select()
    .from(invoicesTable)
    .where(
      and(
        eq(invoicesTable.status, "overdue"),
        isNotNull(invoicesTable.dueDate),
        gte(invoicesTable.dueDate, since),
        lte(invoicesTable.dueDate, new Date()),
      ),
    );
  let total = 0;
  for (const inv of rows) {
    const key = `inv:${inv.organizationId}:${inv.id}`;
    if (notifiedOverdueInvoices.has(key)) continue;
    notifiedOverdueInvoices.add(key);
    const tokens = await tokensForOrg(inv.organizationId);
    if (tokens.length === 0) continue;
    const r = await sendPushToTokens(tokens, {
      title: "💰 Invoice overdue",
      body: `${inv.invoiceNumber} · ₹${Number(inv.total).toLocaleString("en-IN")} unpaid`,
      data: { type: "invoice", invoiceId: inv.id },
    });
    total += r.sent;
  }
  return total;
}

export async function notifyDueTasks(): Promise<number> {
  // Tasks due in the next hour that we haven't notified about yet.
  const now = new Date();
  const next = new Date(Date.now() + 60 * 60_000);
  const rows = await db
    .select()
    .from(tasksTable)
    .where(
      and(
        eq(tasksTable.status, "open"),
        isNotNull(tasksTable.dueAt),
        gte(tasksTable.dueAt, now),
        lte(tasksTable.dueAt, next),
      ),
    );
  let total = 0;
  for (const t of rows) {
    const key = `task:${t.organizationId}:${t.id}`;
    if (notifiedDueTasks.has(key)) continue;
    notifiedDueTasks.add(key);
    const tokens = await tokensForOrg(t.organizationId);
    if (tokens.length === 0) continue;
    const r = await sendPushToTokens(tokens, {
      title: "📋 Task due soon",
      body: t.title,
      data: { type: "task", taskId: t.id },
    });
    total += r.sent;
  }
  return total;
}

export async function tickNotifications(): Promise<void> {
  try {
    const [hot, ovd, due] = await Promise.all([
      notifyHotLeads().catch((err) => {
        logger.warn({ err }, "notifyHotLeads failed");
        return 0;
      }),
      notifyOverdueInvoices().catch((err) => {
        logger.warn({ err }, "notifyOverdueInvoices failed");
        return 0;
      }),
      notifyDueTasks().catch((err) => {
        logger.warn({ err }, "notifyDueTasks failed");
        return 0;
      }),
    ]);
    if (hot + ovd + due > 0) {
      logger.info({ hot, overdue: ovd, dueTasks: due }, "Push notifications sent");
    }
  } catch (err) {
    logger.error({ err }, "tickNotifications crashed");
  }
}

// Suppress unused-import warning when sql is imported but not directly used.
void sql;
