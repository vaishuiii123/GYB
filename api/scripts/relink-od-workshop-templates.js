/**
 * Point workshops that still reference deleted OD templates
 * at the latest Master / Consumer OD templates.
 *
 * Usage:
 *   node relink-od-workshop-templates.js           # dry run
 *   node relink-od-workshop-templates.js --execute
 */
const fs = require("fs");
const path = require("path");
const { TableClient } = require("@azure/data-tables");

function normalize(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function readConnectionString() {
  const candidates = [
    path.resolve(__dirname, "../local.settings.json"),
    path.resolve("C:/Users/VaishnaviSapkal/Downloads/GYB/api/local.settings.json"),
    path.resolve(
      "C:/Users/VaishnaviSapkal/Downloads/GYB-main_GYB/GYB-main/api/local.settings.json"
    ),
  ];
  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    const settings = JSON.parse(fs.readFileSync(p, "utf8"));
    const cs = settings?.Values?.AZURE_STORAGE_CONNECTION_STRING;
    if (cs) return cs;
  }
  throw new Error("AZURE_STORAGE_CONNECTION_STRING is not configured.");
}

async function listPartition(client, partitionKey) {
  const result = [];
  for await (const entity of client.listEntities({
    queryOptions: { filter: `PartitionKey eq '${partitionKey}'` },
  })) {
    result.push(entity);
  }
  return result;
}

async function main() {
  const execute = process.argv.includes("--execute");
  const cs = readConnectionString();
  const workshopClient = TableClient.fromConnectionString(cs, "Workshop");
  const templateClient = TableClient.fromConnectionString(cs, "Template");

  const [workshops, templates] = await Promise.all([
    listPartition(workshopClient, "Workshop"),
    listPartition(templateClient, "Template"),
  ]);

  const master = templates.find(
    (t) =>
      normalize(t.TemplateName) ===
      normalize("Master Organizational Development template")
  );
  const consumer = templates.find(
    (t) => normalize(t.TemplateName) === normalize("Consumer OD template")
  );

  if (!master) throw new Error("Master OD template not found.");
  if (!consumer) throw new Error("Consumer OD template not found.");

  const templateById = new Map(templates.map((t) => [t.rowKey, t]));
  const updates = [];

  for (const workshop of workshops) {
    const currentId = String(workshop.TemplateId || "").trim();
    const current = templateById.get(currentId);
    const name = normalize(workshop.WorkshopName);

    let nextId = "";
    if (!currentId || !current) {
      // Prefer consumer for consumer-named workshops, else master.
      nextId = /consumer/i.test(name) ? consumer.rowKey : master.rowKey;
    } else if (
      /master organizational development/i.test(String(current.TemplateName || ""))
    ) {
      nextId = master.rowKey;
    } else if (/consumer od/i.test(String(current.TemplateName || ""))) {
      nextId = consumer.rowKey;
    }

    if (nextId && nextId !== currentId) {
      updates.push({
        workshopId: workshop.rowKey,
        workshopName: workshop.WorkshopName,
        from: currentId || "(none)",
        fromName: current?.TemplateName || "(missing)",
        to: nextId,
        toName: templateById.get(nextId)?.TemplateName,
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: execute ? "EXECUTE" : "DRY RUN",
        masterId: master.rowKey,
        consumerId: consumer.rowKey,
        masterQuestions: String(master.QuestionIds || "")
          .split(",")
          .filter(Boolean).length,
        consumerQuestions: String(consumer.QuestionIds || "")
          .split(",")
          .filter(Boolean).length,
        updates,
      },
      null,
      2
    )
  );

  if (!execute) return;

  const now = new Date().toISOString();
  for (const item of updates) {
    await workshopClient.updateEntity(
      {
        partitionKey: "Workshop",
        rowKey: item.workshopId,
        TemplateId: item.to,
        ModifiedBy: "OD template relink",
        ModifiedDate: now,
      },
      "Merge"
    );
  }

  console.log(JSON.stringify({ success: true, updated: updates.length }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
