const fs = require("fs");
const path = require("path");
const { TableClient } = require("@azure/data-tables");
const XLSX = require("../../frontend/node_modules/xlsx");

const TEMPLATE_PATTERN = /master organizational development/i;

function normalize(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/[?]+$/g, "")
    .trim()
    .toLowerCase();
}

function parseIds(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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

function readConnectionString() {
  if (process.env.AZURE_STORAGE_CONNECTION_STRING) {
    return process.env.AZURE_STORAGE_CONNECTION_STRING;
  }
  const settings = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "../local.settings.json"), "utf8")
  );
  const connectionString = settings?.Values?.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error("AZURE_STORAGE_CONNECTION_STRING is not configured.");
  }
  return connectionString;
}

async function main() {
  const workbookPath = path.resolve(process.argv[2] || "");
  const execute = process.argv.includes("--execute");

  if (!workbookPath || !fs.existsSync(workbookPath)) {
    throw new Error("Pass the path to the Master OD workbook.");
  }

  const rows = XLSX.utils.sheet_to_json(
    XLSX.readFile(workbookPath).Sheets.Sheet1,
    { defval: "" }
  );

  const connectionString = readConnectionString();
  const categoryClient = TableClient.fromConnectionString(
    connectionString,
    "QuestionnaireCategory"
  );
  const questionClient = TableClient.fromConnectionString(
    connectionString,
    "Questions"
  );
  const templateClient = TableClient.fromConnectionString(
    connectionString,
    "Template"
  );

  const [categories, questions, templates] = await Promise.all([
    listPartition(categoryClient, "Category"),
    listPartition(questionClient, "Question"),
    listPartition(templateClient, "Template"),
  ]);

  const template = templates.find((item) =>
    TEMPLATE_PATTERN.test(item.TemplateName || "")
  );
  if (!template) {
    throw new Error("Master Organizational Development template was not found.");
  }

  const templateCategoryIds = new Set(parseIds(template.CategoryId));
  const questionIdByText = new Map(
    questions.map((item) => [normalize(item.QuestionText), item.rowKey])
  );
  const categoryById = new Map(categories.map((item) => [item.rowKey, item]));

  // Desired assignments come straight from the workbook.
  const desiredByCategoryName = new Map();
  for (const row of rows) {
    const categoryName = normalize(row.Category);
    const questionId = questionIdByText.get(normalize(row.Question));
    if (!categoryName || !questionId) continue;
    if (!desiredByCategoryName.has(categoryName)) {
      desiredByCategoryName.set(categoryName, []);
    }
    const list = desiredByCategoryName.get(categoryName);
    if (!list.includes(questionId)) list.push(questionId);
  }

  const changes = [];
  for (const categoryId of templateCategoryIds) {
    const category = categoryById.get(categoryId);
    if (!category) continue;

    const desired = desiredByCategoryName.get(normalize(category.CategoryName));
    if (!desired) continue;

    const current = parseIds(category.QuestionId);
    const removed = current.filter((id) => !desired.includes(id));
    const added = desired.filter((id) => !current.includes(id));
    if (removed.length === 0 && added.length === 0) continue;

    changes.push({
      categoryId,
      categoryName: category.CategoryName,
      removed,
      added,
      desired,
    });
  }

  const totalAssignments = [...templateCategoryIds].reduce((total, id) => {
    const category = categoryById.get(id);
    const desired =
      desiredByCategoryName.get(normalize(category?.CategoryName)) || [];
    return total + desired.length;
  }, 0);

  console.log(
    JSON.stringify(
      {
        mode: execute ? "EXECUTE" : "DRY RUN",
        workbookRows: rows.length,
        expectedTemplateRows: totalAssignments,
        categoriesChanged: changes.length,
        changes: changes.map(({ desired, ...rest }) => rest),
      },
      null,
      2
    )
  );

  if (!execute || changes.length === 0) return;

  const now = new Date().toISOString();
  for (const change of changes) {
    await categoryClient.updateEntity(
      {
        partitionKey: "Category",
        rowKey: change.categoryId,
        QuestionId: change.desired.join(","),
        ModifiedBy: "Master OD category alignment",
        ModifiedDate: now,
      },
      "Merge"
    );
  }

  console.log(JSON.stringify({ success: true, updated: changes.length }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
