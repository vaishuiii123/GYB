const fs = require("fs");
const path = require("path");
const { TableClient } = require("@azure/data-tables");

async function listAll(client, filter) {
  const items = [];
  for await (const entity of client.listEntities(
    filter ? { queryOptions: { filter } } : undefined
  )) {
    items.push(entity);
  }
  return items;
}

async function main() {
  const cs = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "../local.settings.json"), "utf8")
  ).Values.AZURE_STORAGE_CONNECTION_STRING;

  const workshopClient = TableClient.fromConnectionString(cs, "Workshop");
  const orgClient = TableClient.fromConnectionString(cs, "Organization");
  const workshops = await listAll(workshopClient, "PartitionKey eq 'Workshop'");
  const orgs = await listAll(orgClient);
  const orgIds = new Set(orgs.map((item) => item.rowKey));

  console.log(
    JSON.stringify(
      {
        orgCount: orgs.length,
        orgs: orgs.map((item) => ({
          id: item.rowKey,
          name: item.OrganizationName || item.Name || "",
          partitionKey: item.partitionKey,
        })),
        workshopCount: workshops.length,
        workshops: workshops.map((item) => ({
          id: item.rowKey,
          name: item.WorkshopName,
          orgId: item.OrganizationId,
          orgExists: orgIds.has(String(item.OrganizationId || "")),
          templateId: item.TemplateId,
          preOdTemplateId: item.PreOdTemplateId,
        })),
        missingOrgIds: [
          ...new Set(
            workshops
              .map((item) => String(item.OrganizationId || ""))
              .filter((id) => id && !orgIds.has(id))
          ),
        ],
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
