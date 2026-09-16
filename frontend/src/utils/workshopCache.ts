import {
  getParticipantFromStorage,
  getSelectedWorkshop,
  type SelectedWorkshop,
} from "./selectedWorkshop";
import { fetchOnce } from "./adminListCache";

const WORKSHOP_CACHE_KEY = "gyb-workshop-cache";
const PARTICIPANT_WORKSHOP_CACHE_KEY = "gyb-participant-workshops-cache";
const OD_CHART_CACHE_KEY = "gyb-od-chart-cache-v4";
const OD_LEAVES_CACHE_KEY = "gyb-od-leaves-cache-v1";
const PAGE_DATA_CACHE_KEY = "gyb-page-data-cache";
const CACHE_TTL_MS = 10 * 60 * 1000;
/** OD chart structure rarely changes — keep longer for faster revisits. */
const OD_CHART_TTL_MS = 60 * 60 * 1000;

/** Dedupe concurrent workshop/chart loaders (StrictMode / parallel pages). */
const inflightJson = new Map<string, Promise<unknown>>();

async function fetchJsonOnce<T>(url: string): Promise<T> {
  const existing = inflightJson.get(url);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = (async () => {
    const response = await fetchOnce(url);
    return (await response.json()) as T;
  })().finally(() => {
    inflightJson.delete(url);
  });

  inflightJson.set(url, promise);
  return promise;
}

export type WorkshopRecord = {
  id: string;
  workshopName?: string;
  templateId?: string;
  templateName?: string;
  organizationName?: string;
  organizationId?: string;
  preOdStartDate?: string;
  startDate?: string;
  endDate?: string;
  participantCount?: number;
  preOdQuestionCount?: number;
  preOdQuestionSrNos?: string;
};

export type WorkshopResponse = {
  success: boolean;
  workshop: WorkshopRecord | null;
  workshops?: WorkshopRecord[];
  canEdit?: boolean;
  editMessage?: string;
  error?: string;
};

function parseWorkshopEndMs(endDate?: string) {
  if (!endDate) {
    return null;
  }

  const date = new Date(endDate);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const looksLikeDateOnly =
    endDate.length <= 10 ||
    (date.getUTCHours() === 0 &&
      date.getUTCMinutes() === 0 &&
      date.getUTCSeconds() === 0);

  if (looksLikeDateOnly) {
    date.setHours(23, 59, 59, 999);
  }

  return date.getTime();
}

function parseWorkshopStartMs(startDate?: string) {
  if (!startDate) {
    return null;
  }

  const date = new Date(startDate);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.getTime();
}

export function getWorkshopEditStatus(workshop?: WorkshopRecord | null) {
  if (!workshop) {
    return {
      canEdit: false,
      editMessage: "No workshop is available for your organization.",
    };
  }

  const startMs = parseWorkshopStartMs(workshop.startDate);
  if (startMs !== null && Date.now() < startMs) {
    return {
      canEdit: false,
      editMessage:
        "Workshop modules open once the workshop starts. You can complete the Pre-Workshop Questionnaire until then.",
    };
  }

  const endMs = parseWorkshopEndMs(workshop.endDate);
  if (endMs !== null && Date.now() > endMs) {
    return {
      canEdit: false,
      editMessage:
        "The workshop has ended. You can view your responses but can no longer edit them.",
    };
  }

  return {
    canEdit: true,
    editMessage: "",
  };
}

/** Vision / OD Chart / Actionables: enter after workshop starts; edit only while live. */
export function getWorkshopModuleAccessStatus(
  workshop?: WorkshopRecord | null
) {
  if (!workshop) {
    return {
      enabled: false,
      canEdit: false,
      message: "No workshop is available for your organization.",
    };
  }

  const startMs = parseWorkshopStartMs(workshop.startDate);
  if (startMs !== null && Date.now() < startMs) {
    return {
      enabled: false,
      canEdit: false,
      message:
        "This module opens once the workshop starts. Please complete the Pre-Workshop Questionnaire until then.",
    };
  }

  const editStatus = getWorkshopEditStatus(workshop);
  return {
    enabled: true,
    canEdit: editStatus.canEdit,
    message: editStatus.editMessage,
  };
}

type PreOdWorkshop = Pick<
  WorkshopRecord,
  "preOdQuestionCount" | "preOdStartDate" | "startDate"
>;

export function getFeedbackAccessStatus(workshop?: {
  endDate?: string;
} | null) {
  if (!workshop?.endDate) {
    return {
      enabled: false,
      message: "This window will start once the workshop is finished.",
    };
  }

  const endMs = parseWorkshopEndMs(workshop.endDate);
  if (endMs === null || Date.now() <= endMs) {
    return {
      enabled: false,
      message: "This window will start once the workshop is finished.",
    };
  }

  return {
    enabled: true,
    message: "",
  };
}

export function getPreOdAccessStatus(workshop?: PreOdWorkshop | null) {
  const questionCount = Number(workshop?.preOdQuestionCount || 0);

  if (questionCount <= 0) {
    return {
      available: false,
      canFill: false,
      enabled: false,
      message: "The Pre-Workshop Questionnaire has not been assigned for this workshop yet.",
    };
  }

  const startDate = workshop?.startDate;
  if (startDate) {
    const startMs = new Date(startDate).getTime();
    if (!Number.isNaN(startMs) && Date.now() >= startMs) {
      return {
        available: true,
        canFill: false,
        // Still open for viewing after workshop starts.
        enabled: true,
        message:
          "This window has closed because the workshop has started.",
      };
    }
  }

  const preOdStartDate = workshop?.preOdStartDate;
  if (preOdStartDate) {
    const preOdStartMs = new Date(preOdStartDate).getTime();
    if (!Number.isNaN(preOdStartMs) && Date.now() < preOdStartMs) {
      return {
        available: true,
        canFill: false,
        enabled: false,
        message:
          "The Pre-Workshop Questionnaire is not open yet. Please check back at the scheduled start time.",
      };
    }
  }

  return {
    available: true,
    canFill: true,
    enabled: true,
    message: "",
  };
}

type CacheEntry<T> = {
  savedAt: number;
  data: T;
};

function readCache<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) {
      return null;
    }

    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() - entry.savedAt > CACHE_TTL_MS) {
      sessionStorage.removeItem(key);
      return null;
    }

    return entry.data;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, data: T) {
  const entry: CacheEntry<T> = {
    savedAt: Date.now(),
    data,
  };
  sessionStorage.setItem(key, JSON.stringify(entry));
}

export function getCachedWorkshop(organizationId: string) {
  return readCache<WorkshopResponse>(`${WORKSHOP_CACHE_KEY}:${organizationId}`);
}

export function setCachedWorkshop(organizationId: string, data: WorkshopResponse) {
  writeCache(`${WORKSHOP_CACHE_KEY}:${organizationId}`, data);
}

function participantWorkshopsCacheKey(
  participantId: string,
  organizationId?: string
) {
  return `${PARTICIPANT_WORKSHOP_CACHE_KEY}:${participantId}:${
    organizationId || ""
  }`;
}

export function getCachedParticipantWorkshops(
  participantId: string,
  organizationId?: string
) {
  return readCache<WorkshopResponse>(
    participantWorkshopsCacheKey(participantId, organizationId)
  );
}

export function setCachedParticipantWorkshops(
  participantId: string,
  organizationId: string | undefined,
  data: WorkshopResponse
) {
  writeCache(participantWorkshopsCacheKey(participantId, organizationId), data);

  if (organizationId) {
    setCachedWorkshop(organizationId, data);
  }
}

export function clearCachedParticipantWorkshops(
  participantId: string,
  organizationId?: string
) {
  try {
    sessionStorage.removeItem(
      participantWorkshopsCacheKey(participantId, organizationId)
    );
  } catch {
    // ignore
  }
}

function readOdChartCache<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) {
      return null;
    }

    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() - entry.savedAt > OD_CHART_TTL_MS) {
      sessionStorage.removeItem(key);
      return null;
    }

    return entry.data;
  } catch {
    return null;
  }
}

type OdChartPayload = {
  success: boolean;
  message?: string;
  template?: { id?: string; templateName?: string };
  tops?: unknown[];
};

export function getCachedOdChart(templateId: string) {
  return readOdChartCache<OdChartPayload>(
    `${OD_CHART_CACHE_KEY}:${templateId}`
  );
}

export function setCachedOdChart(templateId: string, data: OdChartPayload) {
  writeCache(`${OD_CHART_CACHE_KEY}:${templateId}`, data);
}

export function getCachedPageData<T>(key: string) {
  return readCache<T>(`${PAGE_DATA_CACHE_KEY}:${key}`);
}

export function setCachedPageData<T>(key: string, data: T) {
  writeCache(`${PAGE_DATA_CACHE_KEY}:${key}`, data);
}

export function clearCachedPageData(key: string) {
  try {
    sessionStorage.removeItem(`${PAGE_DATA_CACHE_KEY}:${key}`);
  } catch {
    // ignore
  }
}

/** Clear all cached page payloads (call on login/logout). */
export function clearAllCachedPageData() {
  try {
    const prefix = `${PAGE_DATA_CACHE_KEY}:`;
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => sessionStorage.removeItem(key));
  } catch {
    // ignore
  }
}

export function workshopFromSelected(
  selected: SelectedWorkshop
): WorkshopRecord {
  return {
    id: selected.id,
    workshopName: selected.workshopName,
    organizationName: selected.organizationName,
    organizationId: selected.organizationId,
    templateId: selected.templateId,
    templateName: selected.templateName,
    preOdStartDate: selected.preOdStartDate,
    startDate: selected.startDate,
    endDate: selected.endDate,
    preOdQuestionCount: selected.preOdQuestionCount,
  };
}

/** Prefer selected workshop so pages can render without waiting on network. */
export function getActiveWorkshopContext() {
  const selected = getSelectedWorkshop();
  const participant = getParticipantFromStorage();
  const workshop = selected ? workshopFromSelected(selected) : null;
  const editStatus = getWorkshopEditStatus(workshop);

  return {
    participant,
    selected,
    workshop,
    canEdit: editStatus.canEdit,
    editMessage: editStatus.editMessage,
  };
}

function applySelectedWorkshop(data: WorkshopResponse): WorkshopResponse {
  const selected = getSelectedWorkshop();
  if (!selected?.id) {
    return data;
  }

  const workshops = data.workshops || [];
  const matched =
    workshops.find((workshop) => workshop.id === selected.id) ||
    ({
      id: selected.id,
      workshopName: selected.workshopName,
      organizationName: selected.organizationName,
      organizationId: selected.organizationId,
      templateId: selected.templateId,
      templateName: selected.templateName,
      preOdStartDate: selected.preOdStartDate,
      startDate: selected.startDate,
      endDate: selected.endDate,
      preOdQuestionCount: selected.preOdQuestionCount,
    } as WorkshopRecord);

  const editStatus = getWorkshopEditStatus(matched);

  return {
    ...data,
    workshop: matched,
    canEdit: editStatus.canEdit,
    editMessage: editStatus.editMessage,
  };
}

export async function fetchParticipantWorkshops(
  participantId: string,
  organizationId?: string,
  options?: { forceRefresh?: boolean }
) {
  if (!options?.forceRefresh) {
    const cached = getCachedParticipantWorkshops(
      participantId,
      organizationId
    );

    // Only reuse cache when it actually has workshops. An empty success
    // response is often a transient miss and should not block refetch.
    if (cached?.success && (cached.workshops || []).length > 0) {
      return applySelectedWorkshop({
        ...cached,
        canEdit:
          typeof cached.canEdit === "boolean"
            ? cached.canEdit
            : getWorkshopEditStatus(cached.workshop).canEdit,
        editMessage:
          cached.editMessage ||
          getWorkshopEditStatus(cached.workshop).editMessage,
      });
    }
  }

  if (options?.forceRefresh) {
    clearCachedParticipantWorkshops(participantId, organizationId);
  }

  const params = new URLSearchParams({
    participantId,
  });

  if (organizationId) {
    params.set("organizationId", organizationId);
  }

  const url = `/api/get-workshop-by-organization?${params.toString()}`;
  const inflightKey = `participant-workshops:${url}`;
  const existing = inflightJson.get(inflightKey);
  if (existing) {
    return existing as Promise<WorkshopResponse>;
  }

  const promise = (async () => {
    let data: WorkshopResponse & { organizationIds?: string[] };

    try {
      data = await fetchJsonOnce<WorkshopResponse & { organizationIds?: string[] }>(
        url
      );
    } catch {
      return {
        success: false,
        workshop: null,
        workshops: [],
      };
    }

    if (!data.success) {
      return {
        success: false,
        workshop: null,
        workshops: [],
        editMessage:
          (data as { error?: string; message?: string }).error ||
          (data as { error?: string; message?: string }).message ||
          "Failed to load workshops.",
      };
    }

    const resolved = applySelectedWorkshop(data);
    setCachedParticipantWorkshops(participantId, organizationId, resolved);
    return resolved;
  })().finally(() => {
    inflightJson.delete(inflightKey);
  });

  inflightJson.set(inflightKey, promise);
  return promise;
}

export async function fetchWorkshopByOrganization(organizationId: string) {
  const cached = getCachedWorkshop(organizationId);
  if (cached) {
    return applySelectedWorkshop({
      ...cached,
      canEdit:
        typeof cached.canEdit === "boolean"
          ? cached.canEdit
          : getWorkshopEditStatus(cached.workshop).canEdit,
      editMessage:
        cached.editMessage ||
        getWorkshopEditStatus(cached.workshop).editMessage,
    });
  }

  const url = `/api/get-workshop-by-organization?organizationId=${encodeURIComponent(
    organizationId
  )}`;
  const data = await fetchJsonOnce<WorkshopResponse>(url);

  if (data.success) {
    const resolved = applySelectedWorkshop(data);
    setCachedWorkshop(organizationId, resolved);
    return resolved;
  }

  return data;
}

async function requestOdChart(
  templateId: string,
  workshopId?: string | null
): Promise<OdChartPayload> {
  const params = new URLSearchParams({
    includeQuestions: "false",
  });

  if (templateId) {
    params.set("templateId", templateId);
  }

  // Only resolve via workshop when templateId is unknown — keeps URL stable
  // and lets the API serve memory cache in ~ms.
  if (!templateId && workshopId) {
    params.set("workshopId", workshopId);
  }

  const url = `/api/get-od-chart?${params.toString()}`;
  const data = await fetchJsonOnce<OdChartPayload>(url);

  if (data.success) {
    const resolvedTemplateId = String(data.template?.id || templateId).trim();
    if (resolvedTemplateId) {
      setCachedOdChart(resolvedTemplateId, data);
    }
  }

  return data;
}

/** Prefetch OD chart into session cache (e.g. from dashboard). */
export function prefetchOdChart(
  templateId?: string | null,
  workshopId?: string | null
) {
  if (!templateId && !workshopId) {
    return;
  }

  if (templateId && getCachedOdChart(templateId)) {
    return;
  }

  void requestOdChart(templateId || "", workshopId).catch(() => {
    // ignore prefetch errors
  });
}

export async function fetchOdChart(
  templateId: string,
  workshopId?: string | null,
  options?: { forceRefresh?: boolean }
): Promise<OdChartPayload> {
  if (!options?.forceRefresh && templateId) {
    const cached = getCachedOdChart(templateId);
    if (cached) {
      return cached;
    }
  }

  return requestOdChart(templateId, workshopId);
}

export type CategoryQuestionsPayload = {
  success: boolean;
  message?: string;
  data?: Array<{
    questionId: string;
    questionText: string;
    questionType: string;
    tagId?: string;
    tagName?: string;
    tagColor?: string;
    attachmentsApplicable?: string;
    options: { optionText: string }[] | string[];
  }>;
  answers?: Record<string, string>;
  attachments?: Record<string, { fileName: string; blobPath?: string; contentType?: string; size?: number }>;
};

function categoryQuestionsCacheKey(
  workshopId: string,
  categoryId: string,
  participantId: string
) {
  return `od-questions:${workshopId}:${categoryId}:${participantId}`;
}

function categoryQuestionsUrl(params: {
  categoryId: string;
  participantId: string;
  workshopId: string;
  templateId: string;
}) {
  const query = new URLSearchParams({
    categoryId: params.categoryId,
    participantId: params.participantId,
    workshopId: params.workshopId,
    templateId: params.templateId,
  });
  return `/api/get-category-questions?${query.toString()}`;
}

/** Load category questions with session cache + in-flight dedupe. */
export async function fetchCategoryQuestions(params: {
  categoryId: string;
  participantId: string;
  workshopId: string;
  templateId: string;
  forceRefresh?: boolean;
}): Promise<CategoryQuestionsPayload> {
  const cacheKey = categoryQuestionsCacheKey(
    params.workshopId,
    params.categoryId,
    params.participantId
  );

  if (!params.forceRefresh) {
    const cached = getCachedPageData<CategoryQuestionsPayload>(cacheKey);
    if (cached?.success) {
      return cached;
    }
  }

  const data = await fetchJsonOnce<CategoryQuestionsPayload>(
    categoryQuestionsUrl(params)
  );

  if (data.success) {
    setCachedPageData(cacheKey, data);
  }

  return data;
}

/** Warm API + session cache before the user opens a leaf. */
export function prefetchCategoryQuestions(params: {
  categoryId: string;
  participantId: string;
  workshopId: string;
  templateId: string;
}) {
  if (
    !params.categoryId ||
    !params.participantId ||
    !params.workshopId ||
    !params.templateId
  ) {
    return;
  }

  const cacheKey = categoryQuestionsCacheKey(
    params.workshopId,
    params.categoryId,
    params.participantId
  );
  if (getCachedPageData(cacheKey)) {
    return;
  }

  void fetchCategoryQuestions(params).catch(() => {
    // ignore prefetch errors
  });
}

export function flattenOdChartLeaves(
  tops: Array<{
    name: string;
    middles: Array<{
      name: string;
      parents: Array<{
        name: string;
        leaves: Array<{ id: string; name: string; fullPath?: string }>;
      }>;
    }>;
  }>,
  templateId?: string
) {
  if (templateId) {
    const cached = readCache<
      Array<{ id: string; name: string; fullPath: string }>
    >(`${OD_LEAVES_CACHE_KEY}:${templateId}`);

    if (cached) {
      return cached;
    }
  }

  const leaves: Array<{ id: string; name: string; fullPath: string }> = [];

  for (const top of tops) {
    for (const middle of top.middles || []) {
      for (const parent of middle.parents || []) {
        for (const leaf of parent.leaves || []) {
          leaves.push({
            id: leaf.id,
            name: leaf.name,
            fullPath:
              leaf.fullPath ||
              [top.name, middle.name, parent.name, leaf.name]
                .filter(Boolean)
                .join(" > "),
          });
        }
      }
    }
  }

  leaves.sort((a, b) => a.name.localeCompare(b.name));

  if (templateId) {
    writeCache(`${OD_LEAVES_CACHE_KEY}:${templateId}`, leaves);
  }

  return leaves;
}
