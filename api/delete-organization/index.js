const { TableClient } = require("@azure/data-tables");

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
      TableClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING,
        "Organization"
      );

    // Mapping table
    const participantClient =
      TableClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING,
        "OrganizationParticipants"
      );

    // Check if participants exist
    let participantCount = 0;

    for await (
      const entity of participantClient.listEntities()
    ) {

      if (
        entity.OrganizationId ===
        organizationId
      ) {
        participantCount++;
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

    await organizationClient.deleteEntity(
      organizationEntity.partitionKey,
      organizationEntity.rowKey
    );

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
