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
