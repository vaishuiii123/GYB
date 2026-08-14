const { getTableClient } = require("../shared/tableHelper");

module.exports = async function (context, req) {
  try {
    const client = getTableClient("Organization");

    const dbStart = Date.now();

    const organizations = [];

    for await (const entity of client.listEntities({
      queryOptions: {
        select: [
          "rowKey",
          "Organization_Name",
          "Contact_Person",
          "Email",
          "Created_By",
        ],
      },
    })) {
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
