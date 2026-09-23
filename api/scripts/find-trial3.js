const fs = require("fs");
const path = require("path");
const { TableClient } = require("@azure/data-tables");

async function main() {
  const cs = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "../local.settings.json"), "utf8")
  ).Values.AZURE_STORAGE_CONNECTION_STRING;

  const client = TableClient.fromConnectionString(cs, "Workshop");
  const all = [];
  for await (const entity of client.listEntities()) {
    all.push({
      pk: entity.partitionKey,
      id: entity.rowKey,
      name: entity.WorkshopName,
      orgId: entity.OrganizationId,
      templateId: entity.TemplateId,
      preOdTemplateId: entity.PreOdTemplateId,
    });
  }

  const trial = all.filter((item) =>
    /trial 3|1789472730561|knav experiment|1790080214443/i.test(
      `${item.name} ${item.id}`
    )
  );

  console.log(
    JSON.stringify(
      {
        total: all.length,
        trialMatches: trial,
        allNames: all.map((item) => `${item.id}:${item.name}`),
      },
      null,
      2
    )
  );

  // Probe getEntity for Trial 3
  try {
    const entity = await client.getEntity("Workshop", "1789472730561");
    console.log("getEntity Trial3 OK", entity.WorkshopName);
  } catch (error) {
    console.log(
      "getEntity Trial3 FAIL",
      error.statusCode,
      error.message?.slice(0, 200)
    );
  }
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
