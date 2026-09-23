const { getTableClient, listPartition } = require("../shared/tableHelper");
const { invalidateParticipants } = require("../shared/cacheInvalidation");


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
      getTableClient("OrganizationParticipants");

    const existingIds = new Set();

    const existingMappings = await listPartition(
      client,
      organizationId,
      ["ParticipantId"]
    );
    for (const entity of existingMappings) {
      existingIds.add(entity.ParticipantId);
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

    invalidateParticipants(organizationId);

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
