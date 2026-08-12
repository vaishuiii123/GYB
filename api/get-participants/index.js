const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
  try {

    const organization = req.query.organization;

    const client = TableClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING,
      "Participants"
    );

    const participants = [];

    // Shared admin view: return all participants (optional organization filter only).
    for await (const entity of client.listEntities()) {
      if (organization && entity.Organisation !== organization) {
        continue;
      }

      participants.push({
        id: entity.rowKey,
        organization: entity.Organisation || "",
        firstName: entity.First_Name || "",
        middleName: entity.Middle_Name || "",
        lastName: entity.Last_Name || "",
        email: entity.Email || "",
        username: entity.Username || "",
        phoneNo: entity.Phone_No || "",
        password: entity.Password || "",
      });
    }

    context.res = {
      status: 200,
      body: {
        success: true,
        participants,
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
