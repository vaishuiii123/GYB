const { getTableClient } = require("../shared/tableHelper");
const { invalidateParticipants } = require("../shared/cacheInvalidation");


module.exports = async function (context, req) {

  try {

    const {
      organizationId,
      participantIds,
    } = req.body;

    if (
      !organizationId ||
      !participantIds ||
      !Array.isArray(participantIds)
    ) {

      context.res = {
        status: 400,
        body: {
          success: false,
          message:
            "organizationId and participantIds are required",
        },
      };

      return;
    }

    const client =
      getTableClient("OrganizationParticipants");

    let deletedCount = 0;

    for (const participantId of participantIds) {
      try {
        await client.deleteEntity(
          organizationId,
          participantId
        );
        deletedCount++;
      } catch (error) {
        if (error.statusCode !== 404) {
          throw error;
        }
      }
    }

    invalidateParticipants(organizationId);

    context.res = {
      status: 200,
      body: {
        success: true,
        deletedCount,
        message:
          "Participant(s) removed successfully",
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
