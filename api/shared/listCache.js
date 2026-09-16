/**
 * Process-level response cache for hot admin list endpoints.
 * Keeps repeat get-organizations / get-workshops in the ~ms range
 * after the first Azure Table load.
 */

const DEFAULT_TTL_MS = 60 * 1000;

/** @type {Map<string, { expiresAt: number, value: unknown }>} */
const store = new Map();

/** @type {Map<string, Promise<unknown>>} */
const inflight = new Map();

function getCached(key) {
  const entry = store.get(key);
  if (!entry) {
    return null;
  }
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

function setCached(key, value, ttlMs = DEFAULT_TTL_MS) {
  store.set(key, {
    expiresAt: Date.now() + ttlMs,
    value,
  });
  return value;
}

function invalidate(key) {
  store.delete(key);
  inflight.delete(key);
}

function invalidateAll(keys) {
  for (const key of keys) {
    invalidate(key);
  }
}

function invalidatePrefix(prefix) {
  for (const key of [...store.keys()]) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
  for (const key of [...inflight.keys()]) {
    if (key.startsWith(prefix)) {
      inflight.delete(key);
    }
  }
}

/**
 * Single-flight: concurrent callers share one loader promise.
 */
async function getOrLoad(key, loader, ttlMs = DEFAULT_TTL_MS) {
  const hit = getCached(key);
  if (hit != null) {
    return { value: hit, cacheHit: true };
  }

  const pending = inflight.get(key);
  if (pending) {
    const value = await pending;
    return { value, cacheHit: true };
  }

  const promise = Promise.resolve()
    .then(loader)
    .then((value) => {
      setCached(key, value, ttlMs);
      inflight.delete(key);
      return value;
    })
    .catch((error) => {
      inflight.delete(key);
      throw error;
    });

  inflight.set(key, promise);
  const value = await promise;
  return { value, cacheHit: false };
}

const CACHE_KEYS = {
  organizations: "list:organizations",
  workshops: "list:workshops",
  visionMissionKeywords: "list:vision-mission-keywords",
};

function workshopByQueryKey(participantId, organizationId) {
  return `list:workshop-by-org:${participantId || ""}:${organizationId || ""}`;
}

function visionMissionResponseKey(participantId, workshopId) {
  return `list:vm-response:${participantId || ""}:${workshopId || ""}`;
}

module.exports = {
  CACHE_KEYS,
  DEFAULT_TTL_MS,
  getCached,
  setCached,
  invalidate,
  invalidateAll,
  invalidatePrefix,
  getOrLoad,
  workshopByQueryKey,
  visionMissionResponseKey,
};
