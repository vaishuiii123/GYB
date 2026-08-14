type CacheEntry<T> = {
  savedAt: number;
  data: T;
};

const CACHE_TTL_MS = 10 * 60 * 1000;

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

export function readAdminListCache<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);

    // Organization page stores a bare array.
    if (Array.isArray(parsed)) {
      return parsed as T;
    }

    const entry = parsed as CacheEntry<T>;
    if (!entry || typeof entry.savedAt !== "number") {
      return null;
    }

    if (Date.now() - entry.savedAt > CACHE_TTL_MS) {
      sessionStorage.removeItem(key);
      return null;
    }

    return entry.data;
  } catch {
    return null;
  }
}

export function writeAdminListCache<T>(key: string, data: T) {
  try {
    // Keep organizations compatible with Organization.tsx.
    if (key === ADMIN_CACHE_KEYS.organizations && Array.isArray(data)) {
      sessionStorage.setItem(key, JSON.stringify(data));
      return;
    }

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

async function prefetchOne(
  url: string,
  cacheKey: string,
  pick: (data: any) => unknown
) {
  try {
    if (readAdminListCache(cacheKey) != null) {
      return;
    }

    const res = await fetch(url);
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
