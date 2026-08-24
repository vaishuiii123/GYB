export type WorkshopLifecycleStatus = "upcoming" | "in-progress" | "completed";

export function parseWorkshopEndMs(endDate?: string) {
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

export function getWorkshopLifecycleStatus(
  workshop: { startDate?: string; endDate?: string },
  nowMs = Date.now()
): WorkshopLifecycleStatus {
  const endMs = parseWorkshopEndMs(workshop.endDate);
  if (endMs !== null && nowMs > endMs) {
    return "completed";
  }

  const startMs = workshop.startDate
    ? new Date(workshop.startDate).getTime()
    : null;

  if (startMs !== null && !Number.isNaN(startMs) && nowMs < startMs) {
    return "upcoming";
  }

  if (endMs !== null || (startMs !== null && !Number.isNaN(startMs))) {
    return "in-progress";
  }

  return "upcoming";
}

export function parseWorkshopStatusParam(
  value: string | null
): WorkshopLifecycleStatus | null {
  if (
    value === "upcoming" ||
    value === "in-progress" ||
    value === "completed"
  ) {
    return value;
  }
  return null;
}

export function workshopStatusLabel(status: WorkshopLifecycleStatus) {
  if (status === "upcoming") {
    return "Upcoming Workshops";
  }
  if (status === "in-progress") {
    return "In Progress Workshops";
  }
  return "Completed Workshops";
}

/**
 * Single workshop a participant may open on the dashboard.
 * Priority:
 * 1) Currently in progress (started, not ended)
 * 2) Upcoming with Pre OD window open (before workshop start)
 * 3) Other upcoming assigned workshops
 * 4) Most recent completed (feedback / review)
 */
export function pickOngoingWorkshop<
  T extends {
    id: string;
    startDate?: string;
    endDate?: string;
    preOdStartDate?: string;
  },
>(workshops: T[], preferredId?: string, nowMs = Date.now()): T | null {
  if (!workshops.length) {
    return null;
  }

  const rank = (workshop: T) => {
    const status = getWorkshopLifecycleStatus(workshop, nowMs);
    if (status === "in-progress") {
      return 0;
    }
    if (status === "upcoming") {
      const startMs = workshop.startDate
        ? new Date(workshop.startDate).getTime()
        : null;
      const preOdMs = workshop.preOdStartDate
        ? new Date(workshop.preOdStartDate).getTime()
        : null;

      if (startMs !== null && !Number.isNaN(startMs) && nowMs < startMs) {
        if (preOdMs === null || Number.isNaN(preOdMs) || nowMs >= preOdMs) {
          return 1; // Pre OD open (or no Pre OD gate)
        }
        return 2; // assigned but Pre OD not open yet
      }
      return 2;
    }
    return 3; // completed
  };

  const buckets: T[][] = [[], [], [], []];
  workshops.forEach((workshop) => {
    buckets[rank(workshop)].push(workshop);
  });

  const pool =
    buckets[0].length > 0
      ? buckets[0]
      : buckets[1].length > 0
        ? buckets[1]
        : buckets[2].length > 0
          ? buckets[2]
          : buckets[3];

  if (preferredId) {
    const preferred = pool.find((item) => item.id === preferredId);
    if (preferred) {
      return preferred;
    }
  }

  return pool[0] || null;
}
