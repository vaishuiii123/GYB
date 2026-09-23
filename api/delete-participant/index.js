const { getTableClient } = require("../shared/tableHelper");
const { invalidateParticipants } = require("../shared/cacheInvalidation");


module.exports = async function (context, req) {
  try {

    const { id } = req.body;

    const client =
      getTableClient("Participants");

    await client.deleteEntity(
      "Participant",
      id
    );

    // Drop organization mappings so they do not
    // block the organization from being deleted
    const mappingClient = getTableClient(
      "OrganizationParticipants"
    );

    for await (
      const mapping of mappingClient.listEntities()
    ) {

      if (mapping.ParticipantId === id) {

        await mappingClient.deleteEntity(
          mapping.partitionKey,
          mapping.rowKey
        );
      }
    }

    invalidateParticipants();

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
