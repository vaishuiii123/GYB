const { TableClient } = require("@azure/data-tables");

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
      TableClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING,
        "OrganizationParticipants"
      );

    let deletedCount = 0;

    for await (
      const entity of client.listEntities()
    ) {

      if (
        entity.OrganizationId ===
          organizationId &&
        participantIds.includes(
          entity.ParticipantId
        )
      ) {

        await client.deleteEntity(
          entity.partitionKey,
          entity.rowKey
        );

        deletedCount++;
      }
    }

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
