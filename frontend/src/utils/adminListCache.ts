type CacheEntry<T> = {
  savedAt: number;
  data: T;
};

const CACHE_TTL_MS = 10 * 60 * 1000;
const FRESH_TTL_MS = 45 * 1000;

/** In-flight GET dedupe so StrictMode / prefetch don't double-hit the API. */
const inflightRequests = new Map<string, Promise<Response>>();

export const ADMIN_CACHE_KEYS = {
  organizations: "organizations_cache",
  participants: "participants_cache",
  workshops: "workshops_cache",
  templates: "templates_cache",
  preOdTemplates: "pre_od_templates_cache",
  tags: "tags_cache",
  topCategories: "top_categories_cache",
  admins: "admins_cache",
  questions: "questions_cache",
  allCategories: "all_categories_cache",
} as const;

function readEntry<T>(key: string): CacheEntry<T> | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);

    // Legacy bare-array cache: treat as stale so we refresh once.
    if (Array.isArray(parsed)) {
      return { savedAt: 0, data: parsed as T };
    }

    const entry = parsed as CacheEntry<T>;
    if (!entry || typeof entry.savedAt !== "number") {
      return null;
    }

    if (Date.now() - entry.savedAt > CACHE_TTL_MS) {
      sessionStorage.removeItem(key);
      return null;
    }

    return entry;
  } catch {
    return null;
  }
}

export function readAdminListCache<T>(key: string): T | null {
  return readEntry<T>(key)?.data ?? null;
}

/** True when cache exists and was written recently — skip background refresh. */
export function isAdminListCacheFresh(key: string, maxAgeMs = FRESH_TTL_MS) {
  const entry = readEntry(key);
  if (!entry) {
    return false;
  }
  return Date.now() - entry.savedAt <= maxAgeMs;
}

export function writeAdminListCache<T>(key: string, data: T) {
  try {
    const entry: CacheEntry<T> = {
      savedAt: Date.now(),
      data,
    };
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // ignore quota / private mode errors
  }
}

export function clearAdminListCache(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/** Deduped fetch — concurrent identical GETs share one network call. */
export function fetchOnce(url: string, init?: RequestInit): Promise<Response> {
  const method = (init?.method || "GET").toUpperCase();
  if (method !== "GET") {
    return fetch(url, init);
  }

  const existing = inflightRequests.get(url);
  if (existing) {
    return existing.then((res) => res.clone());
  }

  const promise = fetch(url, init).finally(() => {
    inflightRequests.delete(url);
  });

  inflightRequests.set(url, promise);
  return promise.then((res) => res.clone());
}

/**
 * Return a fresh session cache hit, otherwise one shared GET.
 * Stale cache is still returned when the network call fails.
 */
export async function loadAdminList<T>(
  url: string,
  cacheKey: string,
  pick: (data: any) => T
): Promise<T | null> {
  if (isAdminListCacheFresh(cacheKey)) {
    return readAdminListCache<T>(cacheKey);
  }

  try {
    const res = await fetchOnce(url);
    const data = await res.json();
    if (!res.ok || data?.success === false) {
      return readAdminListCache<T>(cacheKey);
    }

    const value = pick(data);
    writeAdminListCache(cacheKey, value);
    return value;
  } catch {
    return readAdminListCache<T>(cacheKey);
  }
}
