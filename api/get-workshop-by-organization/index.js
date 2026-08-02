const {
  listWorkshopsForOrganization,
  listWorkshopsForParticipant,
  pickWorkshopForOrganization,
  getWorkshopEditStatus,
} = require("../shared/workshopAccess");

module.exports = async function (context, req) {
  try {
    const organizationId = req.query.organizationId;
    const participantId = req.query.participantId;

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

    context.res = {
      status: 200,
      body: {
        success: true,
        organizationIds,
        workshop: activeWorkshop,
        canEdit: editStatus.canEdit,
        editMessage: editStatus.message,
        workshops,
      },
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
