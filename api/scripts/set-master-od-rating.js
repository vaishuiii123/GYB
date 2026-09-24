/**
 * Set all Master OD questions (and Consumer questions sourced from Master)
 * to QuestionType "Rating" (Red / Yellow / Green UI — no options needed).
 *
 * Consumer-only additional questions keep their existing types.
 *
 * Usage:
 *   node set-master-od-rating.js           # dry run
 *   node set-master-od-rating.js --execute
 */
const fs = require("fs");
const path = require("path");
const { TableClient } = require("@azure/data-tables");

function resolveXlsx() {
  const candidates = [
    path.resolve(__dirname, "../../frontend/node_modules/xlsx"),
    path.resolve(
      "C:/Users/VaishnaviSapkal/Downloads/GYB-main_GYB/GYB-main/frontend/node_modules/xlsx"
    ),
  ];
  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {
      // next
    }
  }
  return require("xlsx");
}

const XLSX = resolveXlsx();

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

function personalizeCompany(value) {
  return text(value)
    .replace(/<<Company's>>/gi, "KNAV's")
    .replace(/<<Compamy's>>/gi, "KNAV's")
    .replace(/<<Company>>/gi, "KNAV")
    .replace(/<<Compamy>>/gi, "KNAV");
}

function readConnectionString() {
  const candidates = [
    path.resolve(__dirname, "../local.settings.json"),
    path.resolve("C:/Users/VaishnaviSapkal/Downloads/GYB/api/local.settings.json"),
    path.resolve(
      "C:/Users/VaishnaviSapkal/Downloads/GYB-main_GYB/GYB-main/api/local.settings.json"
    ),
  ];
  for (const settingsPath of candidates) {
    if (!fs.existsSync(settingsPath)) continue;
    const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
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

function readMasterQuestions(workbookPath) {
  const workbook = XLSX.readFile(workbookPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  const keys = new Set();
  for (const row of rows) {
    const question = personalizeCompany(row.Question);
    if (!question) continue;
    keys.add(normalize(question));
    // Also match unpersonalized text still stored in Azure.
    keys.add(normalize(text(row.Question)));
  }
  return keys;
}

async function main() {
  const execute = process.argv.includes("--execute");
  const masterPath = path.resolve(
    "C:/Users/VaishnaviSapkal/Downloads/Master OD Template.xlsx"
  );
  if (!fs.existsSync(masterPath)) {
    throw new Error(`Master workbook not found: ${masterPath}`);
  }

  const masterKeys = readMasterQuestions(masterPath);
  const cs = readConnectionString();
  const questionClient = TableClient.fromConnectionString(cs, "Questions");
  const questions = await listPartition(questionClient, "Question");

  const toUpdate = [];
  for (const question of questions) {
    const key = normalize(question.QuestionText);
    if (!masterKeys.has(key)) continue;
    if (String(question.QuestionType || "") === "Rating") continue;
    toUpdate.push({
      id: question.rowKey,
      from: question.QuestionType || "",
      text: String(question.QuestionText || "").slice(0, 80),
    });
  }

  const summary = {
    mode: execute ? "EXECUTE" : "DRY RUN",
    masterQuestionKeys: masterKeys.size,
    questionsAlreadyRating: questions.filter(
      (q) =>
        masterKeys.has(normalize(q.QuestionText)) &&
        String(q.QuestionType || "") === "Rating"
    ).length,
    toUpdate: toUpdate.length,
    sample: toUpdate.slice(0, 8),
  };
  console.log(JSON.stringify(summary, null, 2));

  if (!execute) return;

  const now = new Date().toISOString();
  for (const item of toUpdate) {
    await questionClient.updateEntity(
      {
        partitionKey: "Question",
        rowKey: item.id,
        QuestionType: "Rating",
        ModifiedBy: "Master OD rating fix",
        ModifiedDate: now,
      },
      "Merge"
    );
  }

  console.log(
    JSON.stringify({ success: true, updated: toUpdate.length }, null, 2)
  );
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
