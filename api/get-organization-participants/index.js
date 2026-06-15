const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {

  try {

    const organizationId =
      req.query.organizationId;

    const mappingClient =
      TableClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING,
        "OrganizationParticipants"
      );

    const participantClient =
      TableClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING,
        "Participants"
      );

    const participantIds = [];

    // Get all participant IDs assigned to organization
    for await (
      const entity of mappingClient.listEntities()
    ) {

      if (
        entity.OrganizationId ===
        organizationId
      ) {

        participantIds.push(
          entity.ParticipantId
        );
      }
    }

    const participants = [];

    // Get participant details
    for await (
      const participant of participantClient.listEntities()
    ) {

      if (
        participantIds.includes(
          participant.rowKey
        )
      ) {

        participants.push({
          id:
            participant.rowKey,

          firstName:
            participant.First_Name || "",

          middleName:
            participant.Middle_Name || "",

          lastName:
            participant.Last_Name || "",

          email:
            participant.Email || "",

          phoneNo:
            participant.Phone_No || "",

          organization:
            participant.Organisation || "",
        });
      }
    }

    context.res = {
      status: 200,
      body: {
        success: true,
        participants,
      },
    };

  } catch (error) {

    context.log(
      "Error in get-organization-participants:",
      error
    );

    context.res = {
      status: 500,
      body: {
        success: false,
        error:
          error.message,
      },
    };
  }
};
