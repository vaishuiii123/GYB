const { getTableClient } = require("../shared/tableHelper");
const { CACHE_KEYS, invalidate } = require("../shared/listCache");
const { invalidateParticipants } = require("../shared/cacheInvalidation");

module.exports = async function (context, req) {
  try {

    const { organizationId } = req.body;

    if (!organizationId) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "Organization Id is required",
        },
      };
      return;
    }

    // Organization table
    const organizationClient =
      getTableClient("Organization");

    // Mapping table
    const participantClient =
      getTableClient("OrganizationParticipants");

    // Participant records still present in the Participants table
    const existingParticipantIds = new Set();

    for await (
      const participant of getTableClient(
        "Participants"
      ).listEntities({
        queryOptions: { select: ["RowKey"] },
      })
    ) {
      existingParticipantIds.add(
        participant.rowKey
      );
    }

    // Check if participants exist
    let participantCount = 0;

    // Mappings left behind by deleted participants
    const orphanedMappings = [];

    for await (
      const entity of participantClient.listEntities()
    ) {

      if (
        entity.OrganizationId !==
        organizationId
      ) {
        continue;
      }

      if (
        existingParticipantIds.has(
          entity.ParticipantId
        )
      ) {
        participantCount++;
      } else {
        orphanedMappings.push(entity);
      }
    }

    if (participantCount > 0) {

      context.res = {
        status: 400,
        body: {
          success: false,
          message:
            "You cannot delete this organization because participants are assigned.",
        },
      };

      return;
    }

    // Get organization record
    let organizationEntity = null;

    for await (
      const entity of organizationClient.listEntities()
    ) {

      if (
        entity.rowKey ===
        organizationId
      ) {

        organizationEntity = entity;
        break;
      }
    }

    if (!organizationEntity) {

      context.res = {
        status: 404,
        body: {
          success: false,
          message:
            "Organization not found",
        },
      };

      return;
    }

    for (const mapping of orphanedMappings) {
      await participantClient.deleteEntity(
        mapping.partitionKey,
        mapping.rowKey
      );
    }

    await organizationClient.deleteEntity(
      organizationEntity.partitionKey,
      organizationEntity.rowKey
    );

    invalidate(CACHE_KEYS.organizations);
    invalidateParticipants(organizationId);

    context.res = {
      status: 200,
      body: {
        success: true,
        message:
          "Organization deleted successfully",
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
