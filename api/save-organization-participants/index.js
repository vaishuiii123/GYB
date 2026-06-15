const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
  try {

    const {
      organizationId,
      participantIds,
      createdBy,
    } = req.body;

    const client =
      TableClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING,
        "OrganizationParticipants"
      );

    // Remove existing mappings
    const entitiesToDelete = [];

    for await (
      const entity of client.listEntities()
    ) {
      if (
        entity.OrganizationId ===
        organizationId
      ) {
        entitiesToDelete.push(entity);
      }
    }

    for (const entity of entitiesToDelete) {
      await client.deleteEntity(
        entity.partitionKey,
        entity.rowKey
      );
    }

    // Save selected participants
    for (const participantId of participantIds) {

      await client.createEntity({
        partitionKey:
          organizationId,

        rowKey:
          participantId,

        OrganizationId:
          organizationId,

        ParticipantId:
          participantId,

        CreatedBy:
          createdBy,

        CreatedDate:
          new Date().toISOString(),
      });
    }

    context.res = {
      status: 200,
      body: {
        success: true,
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
