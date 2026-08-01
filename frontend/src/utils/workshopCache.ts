import { getSelectedWorkshop } from "./selectedWorkshop";

const WORKSHOP_CACHE_KEY = "gyb-workshop-cache";
const OD_CHART_CACHE_KEY = "gyb-od-chart-cache-v3";
const CACHE_TTL_MS = 5 * 60 * 1000;

export type WorkshopRecord = {
  id: string;
  workshopName?: string;
  templateId?: string;
  templateName?: string;
  organizationName?: string;
  organizationId?: string;
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

export function getWorkshopEditStatus(workshop?: WorkshopRecord | null) {
  if (!workshop) {
    return {
      canEdit: false,
      editMessage: "No workshop is available for your organization.",
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

type PreOdWorkshop = Pick<
  WorkshopRecord,
  "preOdQuestionCount" | "startDate"
>;

export function getFeedbackAccessStatus(workshop?: {
  endDate?: string;
} | null) {
  if (!workshop?.endDate) {
    return {
      enabled: false,
      message: "Workshop feedback opens after the workshop has ended.",
    };
  }

  const endMs = parseWorkshopEndMs(workshop.endDate);
  if (endMs === null || Date.now() <= endMs) {
    return {
      enabled: false,
      message: "Workshop feedback opens after the workshop has ended.",
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
      message: "Pre OD has not been assigned for this workshop yet.",
    };
  }

  const startDate = workshop?.startDate;
  if (startDate) {
    const startMs = new Date(startDate).getTime();
    if (!Number.isNaN(startMs) && Date.now() >= startMs) {
      return {
        available: true,
        canFill: false,
        enabled: false,
        message: "The workshop has started. Pre OD is now closed.",
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

export function getCachedOdChart(templateId: string) {
  return readCache<{ success: boolean; tops: unknown[] }>(
    `${OD_CHART_CACHE_KEY}:${templateId}`
  );
}

export function setCachedOdChart(
  templateId: string,
  data: { success: boolean; tops: unknown[] }
) {
  writeCache(`${OD_CHART_CACHE_KEY}:${templateId}`, data);
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
  organizationId?: string
) {
  const params = new URLSearchParams({
    participantId,
  });

  if (organizationId) {
    params.set("organizationId", organizationId);
  }

  const response = await fetch(
    `/api/get-workshop-by-organization?${params.toString()}`
  );

  let data: WorkshopResponse & { organizationIds?: string[] };

  try {
    data = (await response.json()) as WorkshopResponse & {
      organizationIds?: string[];
    };
  } catch {
    return {
      success: false,
      workshop: null,
      workshops: [],
    };
  }

  if (!response.ok || !data.success) {
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

  if (organizationId) {
    setCachedWorkshop(organizationId, data);
  }

  return applySelectedWorkshop(data);
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

  const response = await fetch(
    `/api/get-workshop-by-organization?organizationId=${encodeURIComponent(
      organizationId
    )}`
  );
  const data = (await response.json()) as WorkshopResponse;

  if (data.success) {
    const resolved = applySelectedWorkshop(data);
    setCachedWorkshop(organizationId, resolved);
    return resolved;
  }

  return data;
}

export async function fetchOdChart(templateId: string) {
  const cached = getCachedOdChart(templateId);
  if (cached) {
    return cached;
  }

  const response = await fetch(
    `/api/get-od-chart?templateId=${encodeURIComponent(
      templateId
    )}&includeQuestions=false`
  );
  const data = await response.json();

  if (data.success) {
    setCachedOdChart(templateId, data);
  }

  return data;
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
  }>
) {
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
  return leaves;
}
