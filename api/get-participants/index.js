const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
  try {

    const organization = req.query.organization;
    const createdBy = req.query.createdBy;

    const client = TableClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING,
      "Participants"
    );

    const participants = [];

    for await (const entity of client.listEntities()) {

      let include = true;

      if (organization) {
        include =
          include &&
          entity.Organisation === organization;
      }

      if (createdBy) {
        include =
          include &&
          entity.Created_By &&
          entity.Created_By.toLowerCase() ===
            createdBy.toLowerCase();
      }

      if (include) {
        participants.push({
          id: entity.rowKey,
          organization: entity.Organisation || "",
          firstName: entity.First_Name || "",
          middleName: entity.Middle_Name || "",
          lastName: entity.Last_Name || "",
          email: entity.Email || "",
          phoneNo: entity.Phone_No || "",
          password: entity.Password || "",
        });
      }
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
