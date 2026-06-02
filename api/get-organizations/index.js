const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
  try {
    const client = TableClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING,
      "Organization"
    );

    const entities = client.listEntities();

    const organizations = [];

    for await (const entity of entities) {
      organizations.push({
        id: entity.rowKey,
        organizationName: entity.Organization_Name || "",
        contactPerson: entity.Contact_Person || "",
        email: entity.Email || "",
        createdBy: entity.Created_By || "",
      });
    }

    return {
      status: 200,
      body: {
        success: true,
        organizations,
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
