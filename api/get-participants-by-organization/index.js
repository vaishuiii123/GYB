const { getTableClient } = require("../shared/tableHelper");


module.exports = async function (context, req) {
  try {
    const organizationId = req.query.organizationId;

    if (!organizationId) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "organizationId is required",
        },
      };
      return;
    }

    const mappingClient = getTableClient("OrganizationParticipants");

    const participantClient = getTableClient("Participants");

    const participantIds = [];

    for await (const entity of mappingClient.listEntities()) {
      if (entity.OrganizationId === organizationId) {
        participantIds.push(entity.ParticipantId);
      }
    }

    const participants = [];

    for await (const participant of participantClient.listEntities()) {
      if (!participantIds.includes(participant.rowKey)) {
        continue;
      }

      participants.push({
        id: participant.rowKey,
        firstName: participant.First_Name || "",
        middleName: participant.Middle_Name || "",
        lastName: participant.Last_Name || "",
        email: participant.Email || "",
        phoneNo: participant.Phone_No || "",
        organization: participant.Organisation || "",
      });
    }

    context.res = {
      status: 200,
      body: {
        success: true,
        participants,
      },
    };
  } catch (error) {
    context.log("Error in get-participants-by-organization:", error);

    context.res = {
      status: 500,
      body: {
        success: false,
        error: error.message,
      },
    };
  }
};
