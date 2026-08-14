const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
  const totalStart = Date.now();

  try {
    const client = TableClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING,
      "Organization"
    );

    const dbStart = Date.now();

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

    const dbTime = Date.now() - dbStart;

    organizations.sort((a, b) =>
      a.organizationName.localeCompare(b.organizationName)
    );

    const totalTime = Date.now() - totalStart;

    context.log(`Organization DB time: ${dbTime} ms`);
    context.log(`Organization total time: ${totalTime} ms`);

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
