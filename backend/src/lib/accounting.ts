import { getDb } from "./firebase";
import { FieldValue } from "firebase-admin/firestore";

const db = () => getDb();

const SEED: Array<{ code: string; name: string; type: "asset" | "liability" | "equity" | "income" | "expense"; subtype: string }> = [
  { code: "1000", name: "Cash", type: "asset", subtype: "cash" },
  { code: "1010", name: "Bank", type: "asset", subtype: "bank" },
  { code: "1100", name: "Accounts Receivable", type: "asset", subtype: "ar" },
  { code: "1200", name: "Inventory", type: "asset", subtype: "inventory" },
  { code: "1300", name: "GST Input Credit", type: "asset", subtype: "gst_input" },
  { code: "2000", name: "Accounts Payable", type: "liability", subtype: "ap" },
  { code: "2100", name: "GST Output Payable", type: "liability", subtype: "gst_output" },
  { code: "2200", name: "Salaries Payable", type: "liability", subtype: "payroll_payable" },
  { code: "3000", name: "Owner's Equity", type: "equity", subtype: "equity" },
  { code: "4000", name: "Sales Revenue", type: "income", subtype: "sales" },
  { code: "5000", name: "Cost of Goods Sold", type: "expense", subtype: "cogs" },
  { code: "5100", name: "Salaries Expense", type: "expense", subtype: "payroll" },
  { code: "5200", name: "Rent Expense", type: "expense", subtype: "rent" },
  { code: "5300", name: "Utilities Expense", type: "expense", subtype: "utilities" },
  { code: "5400", name: "Travel Expense", type: "expense", subtype: "travel" },
  { code: "5500", name: "Office Expense", type: "expense", subtype: "office" },
  { code: "5600", name: "Marketing Expense", type: "expense", subtype: "marketing" },
  { code: "5900", name: "Other Expense", type: "expense", subtype: "other" },
];

export async function ensureChartOfAccounts(organizationId: string): Promise<void> {
  const snap = await db()
    .collection("accounts")
    .where("organizationId", "==", organizationId)
    .limit(1)
    .get();
  if (!snap.empty) return;

  const batch = db().batch();
  for (const s of SEED) {
    const ref = db().collection("accounts").doc();
    batch.set(ref, {
      organizationId,
      code: s.code,
      name: s.name,
      type: s.type,
      subtype: s.subtype,
      isSystem: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
}

export async function getAccountByCode(organizationId: string, code: string) {
  await ensureChartOfAccounts(organizationId);
  const snap = await db()
    .collection("accounts")
    .where("organizationId", "==", organizationId)
    .where("code", "==", code)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
}

export interface JournalLineInput {
  accountCode: string;
  debit?: number;
  credit?: number;
  description?: string;
}

export async function postJournal(opts: {
  organizationId: string;
  entryDate: Date;
  memo?: string;
  sourceType?: string;
  sourceId?: string;
  lines: JournalLineInput[];
}): Promise<string> {
  await ensureChartOfAccounts(opts.organizationId);
  const totalDr = opts.lines.reduce((s, l) => s + Number(l.debit ?? 0), 0);
  const totalCr = opts.lines.reduce((s, l) => s + Number(l.credit ?? 0), 0);
  if (Math.abs(totalDr - totalCr) > 0.01) {
    throw new Error(`Unbalanced journal: dr=${totalDr} cr=${totalCr}`);
  }

  const accountsSnap = await db()
    .collection("accounts")
    .where("organizationId", "==", opts.organizationId)
    .get();
  const byCode = new Map<string, { id: string } & Record<string, unknown>>();
  accountsSnap.docs.forEach((d: FirebaseFirestore.QueryDocumentSnapshot) => {
    byCode.set(d.data().code as string, { id: d.id, ...d.data() });
  });

  const usable = opts.lines.filter((l) => (l.debit ?? 0) !== 0 || (l.credit ?? 0) !== 0);
  for (const ln of usable) {
    if (!byCode.has(ln.accountCode)) {
      throw new Error(`Unknown account code ${ln.accountCode}`);
    }
  }
  if (usable.length === 0) {
    throw new Error("Journal has no non-zero lines");
  }

  return await db().runTransaction(async (tx: FirebaseFirestore.Transaction) => {
    const entryRef = db().collection("journalEntries").doc();
    tx.set(entryRef, {
      organizationId: opts.organizationId,
      entryDate: opts.entryDate.toISOString().slice(0, 10),
      memo: opts.memo ?? null,
      sourceType: opts.sourceType ?? null,
      sourceId: opts.sourceId ?? null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    for (const ln of usable) {
      const acct = byCode.get(ln.accountCode)!;
      const lineRef = db().collection("journalLines").doc();
      tx.set(lineRef, {
        organizationId: opts.organizationId,
        entryId: entryRef.id,
        accountId: acct.id,
        debit: (ln.debit ?? 0).toFixed(2),
        credit: (ln.credit ?? 0).toFixed(2),
        description: ln.description ?? null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    return entryRef.id;
  });
}

export async function reverseAndRepost(
  organizationId: string,
  sourceType: string,
  sourceId: string,
  rebuild: () => Promise<JournalLineInput[] | null>,
  opts: { entryDate: Date; memo?: string },
): Promise<void> {
  await ensureChartOfAccounts(organizationId);
  const lines = await rebuild();
  const totalDr = (lines ?? []).reduce((s, l) => s + Number(l.debit ?? 0), 0);
  const totalCr = (lines ?? []).reduce((s, l) => s + Number(l.credit ?? 0), 0);
  if (lines && Math.abs(totalDr - totalCr) > 0.01) {
    throw new Error(`Unbalanced journal: dr=${totalDr} cr=${totalCr}`);
  }

  const accountsSnap = await db()
    .collection("accounts")
    .where("organizationId", "==", organizationId)
    .get();
  const byCode = new Map<string, { id: string } & Record<string, unknown>>();
  accountsSnap.docs.forEach((d: FirebaseFirestore.QueryDocumentSnapshot) => {
    byCode.set(d.data().code as string, { id: d.id, ...d.data() });
  });

  const usable = (lines ?? []).filter((l) => (l.debit ?? 0) !== 0 || (l.credit ?? 0) !== 0);
  for (const ln of usable) {
    if (!byCode.has(ln.accountCode)) {
      throw new Error(`Unknown account code ${ln.accountCode}`);
    }
  }

  await db().runTransaction(async (tx: FirebaseFirestore.Transaction) => {
    const existingSnap = await db()
      .collection("journalEntries")
      .where("organizationId", "==", organizationId)
      .where("sourceType", "==", sourceType)
      .where("sourceId", "==", sourceId)
      .get();

    for (const doc of existingSnap.docs) {
      const linesSnap = await db()
        .collection("journalLines")
        .where("entryId", "==", doc.id)
        .get();
      for (const lineDoc of linesSnap.docs) {
        tx.delete(lineDoc.ref);
      }
      tx.delete(doc.ref);
    }

    if (usable.length === 0) return;

    const entryRef = db().collection("journalEntries").doc();
    tx.set(entryRef, {
      organizationId,
      entryDate: opts.entryDate.toISOString().slice(0, 10),
      memo: opts.memo ?? null,
      sourceType,
      sourceId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    for (const ln of usable) {
      const acct = byCode.get(ln.accountCode)!;
      const lineRef = db().collection("journalLines").doc();
      tx.set(lineRef, {
        organizationId,
        entryId: entryRef.id,
        accountId: acct.id,
        debit: (ln.debit ?? 0).toFixed(2),
        credit: (ln.credit ?? 0).toFixed(2),
        description: ln.description ?? null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  });
}
