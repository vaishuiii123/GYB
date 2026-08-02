const { getPreOdFillStatus: getSharedPreOdFillStatus } = require("./workshopAccess");

function getPreOdFillStatus(workshop, nowMs = Date.now()) {
  return getSharedPreOdFillStatus(workshop, nowMs);
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
