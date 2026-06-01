const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
  try {
    const {
      organizationName,
      contactPerson,
      email,
    } = req.body;

    const client =
      TableClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING,
        "Organization"
      );

    await client.createEntity({
      partitionKey: "Organisation_name",
      rowKey: Date.now().toString(),

      Organisation_Name:
        organizationName,

      Contact_Person:
        contactPerson,

      Email: email,
    });

    return {
      status: 200,
      body: {
        success: true,
      },
    };
  } catch (error) {
    context.log(error);

    return {
      status: 500,
      body: {
        success: false,
        error: error.message,
      },
    };
  }
};
