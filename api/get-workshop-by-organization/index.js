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
        participantId
      );
      workshops = participantWorkshops.workshops;
      organizationIds = participantWorkshops.organizationIds;
    }

    if (workshops.length === 0 && organizationId) {
      workshops = await listWorkshopsForOrganization(organizationId);
      organizationIds = organizationId ? [organizationId] : [];
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
