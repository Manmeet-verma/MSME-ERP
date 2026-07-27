import { getDb } from "./firebase";
import {
  FieldValue,
  Timestamp,
} from "firebase-admin/firestore";

type WhereClause = [string, FirebaseFirestore.WhereFilterOp, unknown];

const db = () => getDb();

export async function findById(
  collection: string,
  id: string | number,
): Promise<any | null> {
  const snap = await db().collection(collection).doc(String(id)).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

export async function findMany(
  collection: string,
  ...constraints: WhereClause[]
): Promise<any[]> {
  let q: FirebaseFirestore.Query = db().collection(collection);
  if (constraints.length) {
    q = q.where(constraints[0][0], constraints[0][1], constraints[0][2]);
    for (let i = 1; i < constraints.length; i++) {
      q = q.where(constraints[i][0], constraints[i][1], constraints[i][2]);
    }
  }
  const snap = await q.get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function queryMany(
  collection: string,
  buildQuery: (col: FirebaseFirestore.CollectionReference) => FirebaseFirestore.Query,
): Promise<any[]> {
  const q = buildQuery(db().collection(collection));
  const snap = await q.get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function insertOne(
  collection: string,
  data: Record<string, unknown>,
): Promise<string> {
  const ref = await db().collection(collection).add({
    ...data,
    createdAt: data.createdAt || FieldValue.serverTimestamp(),
    updatedAt: data.updatedAt || FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function setById(
  collection: string,
  id: string | number,
  data: Record<string, unknown>,
): Promise<void> {
  await db().collection(collection).doc(String(id)).set(data, { merge: true });
}

export async function updateById(
  collection: string,
  id: string | number,
  data: Record<string, unknown>,
): Promise<void> {
  await db().collection(collection).doc(String(id)).update({
    ...data,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function deleteById(
  collection: string,
  id: string | number,
): Promise<void> {
  await db().collection(collection).doc(String(id)).delete();
}

export async function countDocs(
  collection: string,
  ...constraints: WhereClause[]
): Promise<number> {
  let q: FirebaseFirestore.Query = db().collection(collection);
  if (constraints.length) {
    q = q.where(constraints[0][0], constraints[0][1], constraints[0][2]);
    for (let i = 1; i < constraints.length; i++) {
      q = q.where(constraints[i][0], constraints[i][1], constraints[i][2]);
    }
  }
  const snap = await q.count().get();
  return snap.data().count;
}

export async function runBatch(
  operations: Array<(batch: FirebaseFirestore.WriteBatch) => void>,
): Promise<void> {
  const batch = db().batch();
  for (const op of operations) {
    op(batch);
  }
  await batch.commit();
}

export async function runTransaction<T>(
  fn: (tx: FirebaseFirestore.Transaction) => Promise<T>,
): Promise<T> {
  return db().runTransaction(fn);
}

export function increment(n: number): FieldValue {
  return FieldValue.increment(n);
}

export function serverTimestamp(): FieldValue {
  return FieldValue.serverTimestamp();
}

export function arrayUnion(...elements: unknown[]): FieldValue {
  return FieldValue.arrayUnion(...elements);
}

export function arrayRemove(...elements: unknown[]): FieldValue {
  return FieldValue.arrayRemove(...elements);
}

export function tsToIso(ts: Timestamp | null | undefined): string | null {
  if (!ts) return null;
  if (typeof ts.toDate === "function") return ts.toDate().toISOString();
  return null;
}

export function isoToTs(iso: string | null | undefined): Timestamp | null {
  if (!iso) return null;
  return Timestamp.fromDate(new Date(iso));
}

const INDEX_ERROR_CODES = [9, "FAILED_PRECONDITION"];

function isIndexError(err: unknown): boolean {
  const code = (err as any)?.code;
  return INDEX_ERROR_CODES.includes(code);
}

export async function safeGetDocs(q: FirebaseFirestore.Query): Promise<FirebaseFirestore.QuerySnapshot> {
  try {
    return await q.get();
  } catch (err) {
    if (isIndexError(err)) {
      console.warn(`[firestore] Missing index for query. Run with:\n  firebase deploy --only firestore:indexes\n`, (err as any)?.details);
      return { docs: [], size: 0, empty: true } as unknown as FirebaseFirestore.QuerySnapshot;
    }
    throw err;
  }
}

export { FieldValue, Timestamp };
