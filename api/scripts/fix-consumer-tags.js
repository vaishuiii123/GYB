const fs = require("fs");
const path = require("path");
const { TableClient } = require("@azure/data-tables");
const XLSX = require("../../frontend/node_modules/xlsx");

function normalize(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/[?]+$/g, "")
    .trim()
    .toLowerCase();
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
  const settings = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "../local.settings.json"), "utf8")
  );
  const cs = settings.Values.AZURE_STORAGE_CONNECTION_STRING;
  const rows = XLSX.utils.sheet_to_json(
    XLSX.readFile(
      "C:/Users/VaishnaviSapkal/Downloads/Comsumer OD Template.xlsx"
    ).Sheets.Sheet1,
    { defval: "" }
  );

  const questionClient = TableClient.fromConnectionString(cs, "Questions");
  const tagClient = TableClient.fromConnectionString(cs, "Tags");
  const [questions, tags] = await Promise.all([
    listPartition(questionClient, "Question"),
    listPartition(tagClient, "Tag"),
  ]);

  const questionByText = new Map(
    questions.map((item) => [normalize(item.QuestionText), item])
  );
  const tagByName = new Map(tags.map((item) => [normalize(item.TagName), item]));

  const fixes = [];
  for (const row of rows) {
    const question = questionByText.get(normalize(row.Question));
    const tag = tagByName.get(normalize(row.Tag));
    if (!question || !tag) continue;
    if (String(question.TagId || "") === tag.rowKey) continue;

    await questionClient.updateEntity(
      {
        partitionKey: "Question",
        rowKey: question.rowKey,
        TagId: tag.rowKey,
        ModifiedBy: "Consumer OD tag fix",
        ModifiedDate: new Date().toISOString(),
      },
      "Merge"
    );
    fixes.push({
      id: question.rowKey,
      from: question.TagId || "",
      to: tag.rowKey,
      tag: tag.TagName,
    });
  }

  console.log(JSON.stringify({ fixed: fixes.length, fixes }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
