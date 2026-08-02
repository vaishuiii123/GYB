const {
  listWorkshopsForParticipant,
  pickWorkshopForOrganization,
  getWorkshopEditStatus,
} = require("../shared/workshopAccess");

module.exports = async function (context, req) {
  try {
    const participantId = req.query.participantId;
    const organizationId = req.query.organizationId || "";

    if (!participantId) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "participantId is required.",
        },
      };
      return;
    }

    const { organizationIds, workshops } = await listWorkshopsForParticipant(
      participantId,
      organizationId
    );
    const activeWorkshop = pickWorkshopForOrganization(workshops);
    const editStatus = getWorkshopEditStatus(activeWorkshop);

    context.res = {
      status: 200,
      body: {
        success: true,
        organizationIds,
        workshop: activeWorkshop,
        workshops,
        canEdit: editStatus.canEdit,
        editMessage: editStatus.message,
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
