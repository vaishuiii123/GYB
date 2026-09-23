const fs = require("fs");
const path = require("path");
const { TableClient } = require("@azure/data-tables");
const XLSX = require("../../frontend/node_modules/xlsx");

const TEMPLATE_NAME = "Consumer OD template";
const API_BASE = process.env.GYB_API_BASE || "http://127.0.0.1:7071/api";

function normalize(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/[?]+$/g, "")
    .trim()
    .toLowerCase();
}

function text(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function isYes(value) {
  const raw = String(value || "").trim().toUpperCase();
  return raw === "Y" || raw === "YES" || raw === "TRUE" || raw === "1";
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

function readWorkbook(workbookPath) {
  const workbook = XLSX.readFile(workbookPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  if (rows.length === 0) throw new Error("The workbook has no question rows.");
  return rows
    .map((row, index) => ({
      sourceRow: index + 2,
      category: text(row.Category),
      question: text(row.Question),
      d2c: isYes(row["Consumer D2C"]),
      retail: isYes(row["Consumer Retail"]),
    }))
    .filter((row) => row.d2c || row.retail);
}

async function main() {
  const workbookPath = path.resolve(process.argv[2] || "");
  const execute = process.argv.includes("--execute");

  if (!workbookPath || !fs.existsSync(workbookPath)) {
    throw new Error("Pass the path to the Master OD workbook.");
  }

  const rows = readWorkbook(workbookPath);
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
  const parentClient = TableClient.fromConnectionString(
    connectionString,
    "QuestionnaireParentCategory"
  );
  const middleClient = TableClient.fromConnectionString(
    connectionString,
    "QuestionnaireMiddleCategory"
  );
  const topClient = TableClient.fromConnectionString(
    connectionString,
    "QuestionnaireTopCategory"
  );

  const [categories, questions, templates, parents, middles, tops] =
    await Promise.all([
      listPartition(categoryClient, "Category"),
      listPartition(questionClient, "Question"),
      listPartition(templateClient, "Template"),
      listPartition(parentClient, "ParentCategory"),
      listPartition(middleClient, "MiddleCategory"),
      listPartition(topClient, "TopCategory"),
    ]);

  const questionByText = new Map(
    questions.map((item) => [normalize(item.QuestionText), item])
  );
  const parentById = new Map(parents.map((item) => [item.rowKey, item]));
  const middleById = new Map(middles.map((item) => [item.rowKey, item]));
  const topById = new Map(tops.map((item) => [item.rowKey, item]));

  const master = templates.find((item) =>
    /master organizational development/i.test(item.TemplateName || "")
  );
  const masterCategoryIds = new Set(parseIds(master?.CategoryId));
  const categoryByName = new Map();
  for (const category of categories) {
    const key = normalize(category.CategoryName);
    if (masterCategoryIds.size === 0 || masterCategoryIds.has(category.rowKey)) {
      categoryByName.set(key, category);
    }
  }

  const orderedCategoryIds = [];
  const orderedQuestionIds = [];
  const missingQuestions = [];
  const missingCategories = [];

  for (const row of rows) {
    const question = questionByText.get(normalize(row.question));
    const category = categoryByName.get(normalize(row.category));
    if (!question) missingQuestions.push(row.question);
    if (!category) missingCategories.push(row.category);
    if (!question || !category) continue;

    if (!orderedCategoryIds.includes(category.rowKey)) {
      orderedCategoryIds.push(category.rowKey);
    }
    if (!orderedQuestionIds.includes(question.rowKey)) {
      orderedQuestionIds.push(question.rowKey);
    }
  }

  const categoryNames = [];
  const categoryPaths = [];
  for (const categoryId of orderedCategoryIds) {
    const category = categories.find((item) => item.rowKey === categoryId);
    const parent = parentById.get(category.ParentCategoryId);
    const middle = parent ? middleById.get(parent.MiddleCategoryId) : null;
    const top = middle ? topById.get(middle.TopCategoryId) : null;
    categoryNames.push(category.CategoryName || "");
    categoryPaths.push(
      [
        top?.TopCategoryName,
        middle?.MiddleCategoryName,
        parent?.ParentCategoryName,
        category.CategoryName,
      ]
        .filter(Boolean)
        .join(" > ")
    );
  }

  const existing = templates.find(
    (item) => normalize(item.TemplateName) === normalize(TEMPLATE_NAME)
  );

  const summary = {
    mode: execute ? "EXECUTE" : "DRY RUN",
    sourceRows: rows.length,
    uniqueQuestions: orderedQuestionIds.length,
    categories: orderedCategoryIds.length,
    missingQuestions: [...new Set(missingQuestions)],
    missingCategories: [...new Set(missingCategories)],
    existingTemplateId: existing?.rowKey || null,
    action: existing ? "update" : "create",
    templateName: TEMPLATE_NAME,
    masterTemplatePreserved: Boolean(master),
  };

  console.log(JSON.stringify(summary, null, 2));
  if (missingQuestions.length || missingCategories.length) {
    process.exitCode = 1;
    return;
  }
  if (!execute) return;

  const payload = {
    templateName: TEMPLATE_NAME,
    categoryIds: orderedCategoryIds,
    categoryNames,
    categoryPaths,
    questionIds: orderedQuestionIds,
    createdBy: "Consumer OD workbook import",
    modifiedBy: "Consumer OD workbook import",
  };

  const url = existing
    ? `${API_BASE}/update-template`
    : `${API_BASE}/create-template`;
  const body = existing
    ? { ...payload, templateId: existing.rowKey }
    : payload;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(data.message || data.error || `HTTP ${response.status}`);
  }

  console.log(
    JSON.stringify(
      {
        success: true,
        templateId: data.templateId || existing?.rowKey,
        action: existing ? "updated" : "created",
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
