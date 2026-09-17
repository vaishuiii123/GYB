const {
  listWorkshopsForOrganization,
  listWorkshopsForParticipant,
  pickWorkshopForOrganization,
  getWorkshopEditStatus,
} = require("../shared/workshopAccess");
const {
  getOrLoad,
  workshopByQueryKey,
} = require("../shared/listCache");

async function loadWorkshopByOrganization(organizationId, participantId) {
  let workshops = [];
  let organizationIds = [];

  if (participantId) {
    const participantWorkshops = await listWorkshopsForParticipant(
      participantId,
      organizationId || ""
    );
    workshops = participantWorkshops.workshops;
    organizationIds = participantWorkshops.organizationIds;
  }

  // Fallback when participant links are missing but client still has an org id.
  if (workshops.length === 0 && organizationId) {
    const orgWorkshops = await listWorkshopsForOrganization(organizationId);
    if (orgWorkshops.length > 0) {
      workshops = orgWorkshops;
      organizationIds = [
        ...new Set([organizationId, ...(organizationIds || [])].filter(Boolean)),
      ];
    }
  }

  const activeWorkshop = pickWorkshopForOrganization(workshops);
  const editStatus = getWorkshopEditStatus(activeWorkshop);

  return {
    success: true,
    organizationIds,
    workshop: activeWorkshop,
    canEdit: editStatus.canEdit,
    editMessage: editStatus.message,
    workshops,
  };
}

module.exports = async function (context, req) {
  try {
    const organizationId = String(req.query.organizationId || "").trim();
    const participantId = String(req.query.participantId || "").trim();

    if (!organizationId && !participantId) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "organizationId or participantId is required.",
        },
      };
      return;
    }

    const cacheKey = workshopByQueryKey(participantId, organizationId);
    const { value: body, cacheHit } = await getOrLoad(
      cacheKey,
      () => loadWorkshopByOrganization(organizationId, participantId),
      45 * 1000
    );

    context.res = {
      status: 200,
      headers: {
        "Cache-Control": "private, max-age=30",
        "X-List-Cache": cacheHit ? "HIT" : "MISS",
      },
      body,
    };
  } catch (error) {
    context.log(error);

    context.res = {
      status: 500,
      body: {
        success: false,
        error: error.message,
      },
    };
  }
};
