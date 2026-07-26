/**
 * Tiny in-memory TTL cache to cut Firestore reads.
 * Each cached entry expires after `ttlMs` milliseconds.
 * Key = any string, Value = any (stored by reference).
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

let hitCount = 0;
let missCount = 0;

export function cacheGet<T>(key: string): T | undefined {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) { missCount++; return undefined; }
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    missCount++;
    return undefined;
  }
  hitCount++;
  return entry.value;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function cacheDelete(key: string): void {
  store.delete(key);
}

/** Delete all keys matching a prefix (e.g. "auth:userId123") */
export function cacheDeletePrefix(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

export function cacheStats() {
  return { size: store.size, hits: hitCount, misses: missCount };
}

/** Evict expired entries every 5 minutes */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.expiresAt) store.delete(key);
  }
}, 300_000);
