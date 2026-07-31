const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
  try {
    const client = TableClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING,
      "Organization"
    );

    const organizations = [];

    for await (const entity of client.listEntities()) {
      organizations.push({
        id: entity.rowKey,
        organizationName: entity.Organization_Name || "",
        contactPerson: entity.Contact_Person || "",
        email: entity.Email || "",
        createdBy: entity.Created_By || "",
      });
    }

    organizations.sort((a, b) =>
      a.organizationName.localeCompare(b.organizationName)
    );

    context.res = {
      status: 200,
      body: {
        success: true,
        organizations,
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
