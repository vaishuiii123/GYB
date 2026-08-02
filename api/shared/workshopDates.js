function toDateMs(value) {
  if (!value) {
    return null;
  }

  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/** Normalize datetime-local / ISO values to a stable ISO string for Table Storage. */
function normalizeWorkshopDate(value) {
  const ms = toDateMs(value);
  if (ms === null) {
    return "";
  }

  return new Date(ms).toISOString();
}

function readWorkshopDate(entityValue) {
  if (!entityValue) {
    return "";
  }

  if (entityValue instanceof Date) {
    return entityValue.toISOString();
  }

  return String(entityValue);
}

function validateWorkshopDateOrder({ preOdStartDate, startDate, endDate }) {
  const preOdStartMs = toDateMs(preOdStartDate);
  const startMs = toDateMs(startDate);
  const endMs = toDateMs(endDate);

  if (preOdStartMs === null || startMs === null || endMs === null) {
    return {
      ok: false,
      message: "Pre OD Start, Workshop Start, and Workshop End are required.",
    };
  }

  if (!(preOdStartMs < startMs && startMs < endMs)) {
    return {
      ok: false,
      message:
        "Dates must be in order: Pre OD Start < Workshop Start < Workshop End.",
    };
  }

  return {
    ok: true,
    preOdStartDate: new Date(preOdStartMs).toISOString(),
    startDate: new Date(startMs).toISOString(),
    endDate: new Date(endMs).toISOString(),
  };
}

module.exports = {
  toDateMs,
  normalizeWorkshopDate,
  readWorkshopDate,
  validateWorkshopDateOrder,
};
