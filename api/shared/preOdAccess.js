function parseWorkshopStartMs(startDate) {
  if (!startDate) {
    return null;
  }

  const date = new Date(startDate);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.getTime();
}

function canFillPreOd(workshop, nowMs = Date.now()) {
  const startMs = parseWorkshopStartMs(
    workshop?.startDate || workshop?.StartDate
  );

  if (startMs === null) {
    return true;
  }

  return nowMs < startMs;
}

function getPreOdFillStatus(workshop, nowMs = Date.now()) {
  const questionCount = Number(workshop?.preOdQuestionCount || 0);

  if (questionCount <= 0) {
    return {
      available: false,
      canFill: false,
      message: "Pre OD has not been assigned for this workshop yet.",
    };
  }

  if (!canFillPreOd(workshop, nowMs)) {
    return {
      available: true,
      canFill: false,
      message: "The workshop has started. Pre OD is now closed.",
    };
  }

  return {
    available: true,
    canFill: true,
    message: "",
  };
}

async function assertPreOdFillable({
  workshopId,
  organizationId,
  getWorkshopById,
  getWorkshopForOrganization,
}) {
  let workshop = null;

  if (workshopId) {
    workshop = await getWorkshopById(workshopId);
  }

  if (!workshop && organizationId) {
    workshop = await getWorkshopForOrganization(organizationId);
  }

  if (!workshop) {
    return {
      allowed: false,
      status: 404,
      message: "Workshop not found.",
    };
  }

  const fillStatus = getPreOdFillStatus(workshop);

  if (!fillStatus.available) {
    return {
      allowed: false,
      status: 404,
      message: fillStatus.message,
    };
  }

  if (!fillStatus.canFill) {
    return {
      allowed: false,
      status: 403,
      message: fillStatus.message,
    };
  }

  return {
    allowed: true,
    workshop,
  };
}

module.exports = {
  getPreOdFillStatus,
  assertPreOdFillable,
};
