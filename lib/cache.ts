/**
 * High-Performance Financial In-Memory Runtime Cache
 *
 * Designed for EventKhata financial data:
 * 1. Fast in-memory resolution (0ms roundtrip for active navigation).
 * 2. Request deduplication (parallel requests share the same promise).
 * 3. Short default TTL (45 seconds) so numbers are always fresh.
 * 4. Tag-based instant invalidation: Any payment mutation (insert, update, delete)
 *    immediately purges related tags so users NEVER see stale ledger balances,
 *    and NEVER need to manually clear browser cache.
 */

type CacheEntry<T> = {
  data: T;
  timestamp: number;
  ttl: number;
  tags: string[];
};

const store = new Map<string, CacheEntry<any>>();
const inFlightPromises = new Map<string, Promise<any>>();

const DEFAULT_TTL_MS = 45 * 1000; // 45 seconds

/**
 * Fetch with in-memory caching and request deduplication.
 */
export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: {
    ttlMs?: number;
    tags?: string[];
    forceFresh?: boolean;
  }
): Promise<T> {
  const ttl = options?.ttlMs ?? DEFAULT_TTL_MS;
  const tags = options?.tags ?? [];
  const forceFresh = options?.forceFresh ?? false;
  const now = Date.now();

  // 1. Return fresh cached data if valid and not forced
  if (!forceFresh) {
    const entry = store.get(key);
    if (entry && now - entry.timestamp < entry.ttl) {
      return entry.data as T;
    }
  }

  // 2. Deduplicate simultaneous in-flight network requests
  if (inFlightPromises.has(key)) {
    return inFlightPromises.get(key) as Promise<T>;
  }

  // 3. Execute fetcher
  const promise = (async () => {
    try {
      const data = await fetcher();
      store.set(key, {
        data,
        timestamp: Date.now(),
        ttl,
        tags,
      });
      return data;
    } finally {
      inFlightPromises.delete(key);
    }
  })();

  inFlightPromises.set(key, promise);
  return promise;
}

/**
 * Instantly invalidate cache by key, prefix, or tag.
 * Call this immediately after any ledger/payment/event write operation!
 */
export function invalidateCache(targets?: string | string[]): void {
  if (!targets) {
    store.clear();
    inFlightPromises.clear();
    return;
  }

  const targetList = Array.isArray(targets) ? targets : [targets];

  for (const [key, entry] of store.entries()) {
    const matchesKeyOrPrefix = targetList.some(
      (t) => key === t || key.startsWith(`${t}:`) || key.startsWith(`${t}/`)
    );
    const matchesTag = targetList.some((t) => entry.tags.includes(t));

    if (matchesKeyOrPrefix || matchesTag) {
      store.delete(key);
      inFlightPromises.delete(key);
    }
  }
}

/**
 * Direct cache setter.
 */
export function setCache<T>(
  key: string,
  data: T,
  options?: { ttlMs?: number; tags?: string[] }
): void {
  store.set(key, {
    data,
    timestamp: Date.now(),
    ttl: options?.ttlMs ?? DEFAULT_TTL_MS,
    tags: options?.tags ?? [],
  });
}

/**
 * Direct cache reader.
 */
export function getCache<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > entry.ttl) {
    store.delete(key);
    return null;
  }
  return entry.data as T;
}
