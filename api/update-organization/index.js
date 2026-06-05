const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
  try {
    const {
      id,
      organizationName,
      contactPerson,
      email,
    } = req.body;

    if (
      !id ||
      !organizationName ||
      !contactPerson ||
      !email
    ) {
      return {
        status: 400,
        body: {
          success: false,
          error: "All fields are required",
        },
      };
    }

    const client =
      TableClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING,
        "Organization"
      );

    await client.updateEntity(
      {
        partitionKey: "Organization",
        rowKey: id,
        Organization_Name: organizationName,
        Contact_Person: contactPerson,
        Email: email,
      },
      "Merge"
    );

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
