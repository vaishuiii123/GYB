const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
  try {

    const {
      organizationId,
      participantIds,
      createdBy,
    } = req.body;

    if (
      !organizationId ||
      !participantIds ||
      !Array.isArray(participantIds) ||
      participantIds.length === 0
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

    const existingIds = new Set();

    for await (const entity of client.listEntities()) {
      if (entity.OrganizationId === organizationId) {
        existingIds.add(entity.ParticipantId);
      }
    }

    let addedCount = 0;

    for (const participantId of participantIds) {
      if (existingIds.has(participantId)) {
        continue;
      }

      await client.createEntity({
        partitionKey: organizationId,
        rowKey: participantId,
        OrganizationId: organizationId,
        ParticipantId: participantId,
        CreatedBy: createdBy || "",
        CreatedDate: new Date().toISOString(),
      });

      existingIds.add(participantId);
      addedCount++;
    }

    context.res = {
      status: 200,
      body: {
        success: true,
        addedCount,
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
