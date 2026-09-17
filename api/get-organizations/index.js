const { getTableClient } = require("../shared/tableHelper");
const { CACHE_KEYS, getOrLoad } = require("../shared/listCache");

async function loadOrganizations() {
  const client = getTableClient("Organization");
  const organizations = [];

  for await (const entity of client.listEntities({
    queryOptions: {
      filter: `PartitionKey eq 'Organization'`,
      select: [
        "RowKey",
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

  organizations.sort((a, b) =>
    a.organizationName.localeCompare(b.organizationName)
  );

  return organizations;
}

module.exports = async function (context, req) {
  try {
    const { value: organizations, cacheHit } = await getOrLoad(
      CACHE_KEYS.organizations,
      loadOrganizations
    );

    context.res = {
      status: 200,
      headers: {
        "Cache-Control": "private, max-age=30",
        "X-List-Cache": cacheHit ? "HIT" : "MISS",
      },
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
