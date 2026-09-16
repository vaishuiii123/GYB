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

async function prefetchOne(
  url: string,
  cacheKey: string,
  pick: (data: any) => unknown
) {
  try {
    if (isAdminListCacheFresh(cacheKey)) {
      return;
    }

    const res = await fetchOnce(url);
    const data = await res.json();
    if (!res.ok || !data?.success) {
      return;
    }

    writeAdminListCache(cacheKey, pick(data));
  } catch {
    // ignore prefetch errors
  }
}

/** Warm common admin list caches after login / on dashboard. */
export function prefetchAdminLists() {
  void prefetchOne(
    "/api/get-organizations",
    ADMIN_CACHE_KEYS.organizations,
    (data) => data.organizations || []
  );
  void prefetchOne(
    "/api/get-participants",
    ADMIN_CACHE_KEYS.participants,
    (data) => data.participants || []
  );
  void prefetchOne(
    "/api/get-workshops",
    ADMIN_CACHE_KEYS.workshops,
    (data) => data.workshops || []
  );
  void prefetchOne(
    "/api/get-templates",
    ADMIN_CACHE_KEYS.templates,
    (data) => data.templates || []
  );
  void prefetchOne(
    "/api/get-pre-od-templates",
    ADMIN_CACHE_KEYS.preOdTemplates,
    (data) => data.templates || []
  );
  void prefetchOne(
    "/api/get-tags",
    ADMIN_CACHE_KEYS.tags,
    (data) => data.data || []
  );
  void prefetchOne(
    "/api/get-top-categories",
    ADMIN_CACHE_KEYS.topCategories,
    (data) => data.data || []
  );
  void prefetchOne(
    "/api/get-admins",
    ADMIN_CACHE_KEYS.admins,
    (data) => data.admins || []
  );
}
