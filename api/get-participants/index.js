const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
  try {
    const createdBy = req.query.createdBy;

    const client = TableClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING,
      "Participants"
    );

    const entities = client.listEntities();

    const participants = [];

    for await (const entity of entities) {
      if (
        entity.Created_By &&
        entity.Created_By.toLowerCase() === createdBy.toLowerCase()
      ) {
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

    return {
      status: 200,
      body: {
        success: true,
        participants,
      },
    };
  } catch (error) {
    return {
      status: 500,
      body: {
        success: false,
        error: error.message,
      },
    };
  }
};
