const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {

  try {

    const {
      organizationId,
      participantId,
    } = req.body;

    if (
      !organizationId ||
      !participantId
    ) {

      context.res = {
        status: 400,
        body: {
          success: false,
          message:
            "organizationId and participantId are required",
        },
      };

      return;
    }

    const client =
      TableClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING,
        "OrganizationParticipants"
      );

    let entityToDelete = null;

    for await (
      const entity of client.listEntities()
    ) {

      if (
        entity.OrganizationId ===
          organizationId &&
        entity.ParticipantId ===
          participantId
      ) {

        entityToDelete = entity;
        break;
      }
    }

    if (!entityToDelete) {

      context.res = {
        status: 404,
        body: {
          success: false,
          message:
            "Participant assignment not found",
        },
      };

      return;
    }

    await client.deleteEntity(
      entityToDelete.partitionKey,
      entityToDelete.rowKey
    );

    context.res = {
      status: 200,
      body: {
        success: true,
        message:
          "Participant removed successfully",
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
