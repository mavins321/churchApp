/**
 * High-performance In-Memory & LocalStorage Query Cache (Stale-While-Revalidate)
 * Prevents redundant Firestore network roundtrips when navigating between tabs.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();

export function getCachedData<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) {
    try {
      const stored = sessionStorage.getItem(`ft_cache_${key}`);
      if (stored) {
        const parsed: CacheEntry<T> = JSON.parse(stored);
        if (Date.now() - parsed.timestamp < parsed.ttlMs * 2) {
          memoryCache.set(key, parsed);
          return parsed.data;
        }
      }
    } catch {}
    return null;
  }
  return entry.data;
}

export function isCacheStale(key: string): boolean {
  const entry = memoryCache.get(key);
  if (!entry) return true;
  return Date.now() - entry.timestamp > entry.ttlMs;
}

export function setCachedData<T>(key: string, data: T, ttlMs = 90000): void {
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    ttlMs
  };
  memoryCache.set(key, entry);
  try {
    sessionStorage.setItem(`ft_cache_${key}`, JSON.stringify(entry));
  } catch {}
}

export function invalidateCache(keyPrefix?: string): void {
  if (!keyPrefix) {
    memoryCache.clear();
    try {
      Object.keys(sessionStorage).forEach(k => {
        if (k.startsWith('ft_cache_')) sessionStorage.removeItem(k);
      });
    } catch {}
    return;
  }

  for (const k of memoryCache.keys()) {
    if (k.startsWith(keyPrefix)) {
      memoryCache.delete(k);
    }
  }

  try {
    Object.keys(sessionStorage).forEach(k => {
      if (k.startsWith(`ft_cache_${keyPrefix}`)) sessionStorage.removeItem(k);
    });
  } catch {}
}

/**
 * Executes fetcher with Stale-While-Revalidate semantics.
 * If cached data exists, calls onData immediately, then executes fetcher in background if stale.
 */
export async function staleWhileRevalidate<T>(
  key: string,
  fetcher: () => Promise<T>,
  onData: (data: T, fromCache: boolean) => void,
  ttlMs = 90000
): Promise<T> {
  const cached = getCachedData<T>(key);
  const stale = isCacheStale(key);

  if (cached !== null) {
    onData(cached, true);
    if (!stale) {
      return cached;
    }
  }

  try {
    const fresh = await fetcher();
    setCachedData(key, fresh, ttlMs);
    onData(fresh, false);
    return fresh;
  } catch (err) {
    if (cached !== null) {
      return cached;
    }
    throw err;
  }
}
