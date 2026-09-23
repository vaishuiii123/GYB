const {
  getTableClient,
  getEntitiesByKeys,
  listPartition,
} = require("../shared/tableHelper");
const {
  getOrLoad,
  organizationParticipantsKey,
} = require("../shared/listCache");


module.exports = async function (context, req) {

  try {

    const organizationId =
      req.query.organizationId;

    const mappingClient =
      getTableClient("OrganizationParticipants");

    const participantClient =
      getTableClient("Participants");

    const { value: participants } = await getOrLoad(
      organizationParticipantsKey(organizationId),
      async () => {
        const mappings = await listPartition(
          mappingClient,
          organizationId,
          ["ParticipantId"]
        );
        const records = await getEntitiesByKeys(
          participantClient,
          "Participant",
          mappings.map((entity) => entity.ParticipantId)
        );

        return records.map((participant) => ({
          id: participant.rowKey,
          firstName: participant.First_Name || "",
          middleName: participant.Middle_Name || "",
          lastName: participant.Last_Name || "",
          email: participant.Email || "",
          username: participant.Username || "",
          phoneNo: participant.Phone_No || "",
          organization: participant.Organisation || "",
        }));
      }
    );

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
