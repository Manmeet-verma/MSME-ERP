import { getDb } from "./firebase";
import {
  type DocumentData,
  type Query,
  type QueryConstraint,
  type FirestoreDataConverter,
  FieldValue,
  Timestamp,
} from "firebase-admin/firestore";

const db = () => getDb();

// ---------------------------------------------------------------------------
// Generic helpers that replicate the most-used Drizzle patterns
// ---------------------------------------------------------------------------

/** Get a single document by ID */
export async function findById<T extends DocumentData>(
  collection: string,
  id: string | number,
): Promise<(T & { id: string }) | null> {
  const snap = await db().collection(collection).doc(String(id)).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as T & { id: string };
}

/** Query documents with optional constraints and return as array */
export async function findMany<T extends DocumentData>(
  collection: string,
  ...constraints: QueryConstraint[]
): Promise<(T & { id: string })[]> {
  let q: Query = db().collection(collection);
  if (constraints.length) {
    q = q.where(...constraints[0]);
    for (let i = 1; i < constraints.length; i++) {
      q = q.where(...constraints[i]);
    }
  }
  const snap = await q.get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as T & { id: string }));
}

/** Query with full Query[] builder pattern */
export async function queryMany<T extends DocumentData>(
  collection: string,
  buildQuery: (col: ReturnType<typeof db>["collection"]) => Query,
): Promise<(T & { id: string })[]> {
  const q = buildQuery(db().collection(collection));
  const snap = await q.get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as T & { id: string }));
}

/** Insert a document and return its ID */
export async function insertOne<T extends DocumentData>(
  collection: string,
  data: T,
): Promise<string> {
  const ref = await db().collection(collection).add({
    ...data,
    createdAt: data.createdAt || FieldValue.serverTimestamp(),
    updatedAt: data.updatedAt || FieldValue.serverTimestamp(),
  });
  return ref.id;
}

/** Set a document with explicit ID */
export async function setById<T extends DocumentData>(
  collection: string,
  id: string | number,
  data: Partial<T>,
): Promise<void> {
  await db().collection(collection).doc(String(id)).set(data, { merge: true });
}

/** Update a document by ID */
export async function updateById<T extends DocumentData>(
  collection: string,
  id: string | number,
  data: Partial<T>,
): Promise<void> {
  await db().collection(collection).doc(String(id)).update({
    ...data,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/** Delete a document by ID */
export async function deleteById(
  collection: string,
  id: string | number,
): Promise<void> {
  await db().collection(collection).doc(String(id)).delete();
}

/** Count documents matching constraints */
export async function countDocs(
  collection: string,
  ...constraints: QueryConstraint[]
): Promise<number> {
  let q: Query = db().collection(collection);
  if (constraints.length) {
    q = q.where(...constraints[0]);
    for (let i = 1; i < constraints.length; i++) {
      q = q.where(...constraints[i]);
    }
  }
  const snap = await q.count().get();
  return snap.data().count;
}

/** Run a batch of writes atomically */
export async function runBatch(
  operations: Array<(batch: ReturnType<Firestore["batch"]>) => void>,
): Promise<void> {
  const batch = db().batch();
  for (const op of operations) {
    op(batch);
  }
  await batch.commit();
}

/** Run a transaction */
export async function runTransaction<T>(
  fn: (tx: FirebaseFirestore.Transaction) => Promise<T>,
): Promise<T> {
  return db().runTransaction(fn);
}

/** Increment a numeric field */
export function increment(n: number): FieldValue {
  return FieldValue.increment(n);
}

/** Server timestamp */
export function serverTimestamp(): FieldValue {
  return FieldValue.serverTimestamp();
}

/** Array union */
export function arrayUnion(...elements: unknown[]): FieldValue {
  return FieldValue.arrayUnion(...elements);
}

/** Array remove */
export function arrayRemove(...elements: unknown[]): FieldValue {
  return FieldValue.arrayRemove(...elements);
}

/** Convert Firestore Timestamp to ISO string or return null */
export function tsToIso(ts: Timestamp | null | undefined): string | null {
  if (!ts) return null;
  if (typeof ts.toDate === "function") return ts.toDate().toISOString();
  return null;
}

/** Convert ISO string to Firestore Timestamp */
export function isoToTs(iso: string | null | undefined): Timestamp | null {
  if (!iso) return null;
  return Timestamp.fromDate(new Date(iso));
}

// ---------------------------------------------------------------------------
// Higher-level query builder for complex where clauses
// ---------------------------------------------------------------------------

export { FieldValue, Timestamp, type Query, type QueryConstraint, type FirestoreDataConverter };
