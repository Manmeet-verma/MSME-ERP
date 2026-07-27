import { getDb } from "./firebase";
import { Timestamp } from "firebase-admin/firestore";
import { sendPushToTokens } from "./push";
import { logger } from "./logger";

const db = () => getDb();

const notifiedHotLeads = new Set<string>();
const notifiedOverdueInvoices = new Set<string>();
const notifiedDueTasks = new Set<string>();

async function tokensForOrg(orgId: string): Promise<string[]> {
  const snap = await db()
    .collection("pushTokens")
    .where("organizationId", "==", orgId)
    .get();
  return snap.docs.map((d: FirebaseFirestore.QueryDocumentSnapshot) => d.data().token as string);
}

export async function notifyHotLeads(): Promise<number> {
  const since = Timestamp.fromDate(new Date(Date.now() - 10 * 60_000));
  const snap = await db()
    .collection("leads")
    .where("priority", "==", "hot")
    .where("createdAt", ">=", since)
    .get();
  let total = 0;
  for (const doc of snap.docs) {
    const lead = doc.data();
    const key = `hot:${lead.organizationId}:${doc.id}`;
    if (notifiedHotLeads.has(key)) continue;
    notifiedHotLeads.add(key);
    const tokens = await tokensForOrg(lead.organizationId);
    if (tokens.length === 0) continue;
    const r = await sendPushToTokens(tokens, {
      title: "🔥 Hot lead",
      body: `${lead.name}${lead.company ? ` · ${lead.company}` : ""}${lead.product ? ` · ${lead.product}` : ""}`,
      data: { type: "lead", leadId: doc.id },
    });
    total += r.sent;
  }
  return total;
}

export async function notifyOverdueInvoices(): Promise<number> {
  const since = Timestamp.fromDate(new Date(Date.now() - 86_400_000));
  const now = Timestamp.now();
  const snap = await db()
    .collection("invoices")
    .where("status", "==", "overdue")
    .where("dueDate", ">=", since)
    .where("dueDate", "<=", now)
    .get();
  let total = 0;
  for (const doc of snap.docs) {
    const inv = doc.data();
    const key = `inv:${inv.organizationId}:${doc.id}`;
    if (notifiedOverdueInvoices.has(key)) continue;
    notifiedOverdueInvoices.add(key);
    const tokens = await tokensForOrg(inv.organizationId);
    if (tokens.length === 0) continue;
    const r = await sendPushToTokens(tokens, {
      title: "💰 Invoice overdue",
      body: `${inv.invoiceNumber} · ₹${Number(inv.total).toLocaleString("en-IN")} unpaid`,
      data: { type: "invoice", invoiceId: doc.id },
    });
    total += r.sent;
  }
  return total;
}

export async function notifyDueTasks(): Promise<number> {
  const now = Timestamp.fromDate(new Date());
  const next = Timestamp.fromDate(new Date(Date.now() + 60 * 60_000));
  const snap = await db()
    .collection("tasks")
    .where("status", "==", "open")
    .where("dueAt", ">=", now)
    .where("dueAt", "<=", next)
    .get();
  let total = 0;
  for (const doc of snap.docs) {
    const t = doc.data();
    const key = `task:${t.organizationId}:${doc.id}`;
    if (notifiedDueTasks.has(key)) continue;
    notifiedDueTasks.add(key);
    const tokens = await tokensForOrg(t.organizationId);
    if (tokens.length === 0) continue;
    const r = await sendPushToTokens(tokens, {
      title: "📋 Task due soon",
      body: t.title,
      data: { type: "task", taskId: doc.id },
    });
    total += r.sent;
  }
  return total;
}

export async function tickNotifications(): Promise<void> {
  try {
    const [hot, ovd, due] = await Promise.all([
      notifyHotLeads().catch((err: unknown) => {
        logger.warn({ err }, "notifyHotLeads failed");
        return 0;
      }),
      notifyOverdueInvoices().catch((err: unknown) => {
        logger.warn({ err }, "notifyOverdueInvoices failed");
        return 0;
      }),
      notifyDueTasks().catch((err: unknown) => {
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
