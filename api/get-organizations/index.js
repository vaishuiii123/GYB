const { TableClient } = require("@azure/data-tables");

const client = TableClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING,
  "Organization"
);

// Cache shared by warm Azure Function instances
let organizationsCache = null;
let cacheTime = 0;

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function loadOrganizations() {
  const organizations = [];

  for await (const entity of client.listEntities({
    select: [
      "Organization_Name",
      "Contact_Person",
      "Email",
      "Created_By",
    ],
  })) {
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

  return organizations;
}

module.exports = async function (context, req) {
  const start = Date.now();

  try {
    // Return cached data if still valid
    if (
      organizationsCache &&
      Date.now() - cacheTime < CACHE_DURATION
    ) {
      context.log(
        `Returning cached organizations in ${
          Date.now() - start
        } ms`
      );

      context.res = {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "private, max-age=300",
        },
        body: {
          success: true,
          organizations: organizationsCache,
          cached: true,
        },
      };

      return;
    }

    // Cache expired or doesn't exist
    const organizations = await loadOrganizations();

    organizationsCache = organizations;
    cacheTime = Date.now();

    context.log(
      `Loaded organizations from Azure Table in ${
        Date.now() - start
      } ms`
    );

    context.res = {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=300",
      },
      body: {
        success: true,
        organizations,
        cached: false,
      },
    };
  } catch (error) {
    context.log.error(
      "get-organizations failed:",
      error
    );

    context.res = {
      status: 500,
      body: {
        success: false,
        error: error.message,
      },
    };
  }
};