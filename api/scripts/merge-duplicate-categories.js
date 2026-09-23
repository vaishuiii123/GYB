const fs = require("fs");
const path = require("path");
const { TableClient } = require("@azure/data-tables");

const TABLES = {
  tops: "QuestionnaireTopCategory",
  middles: "QuestionnaireMiddleCategory",
  parents: "QuestionnaireParentCategory",
  categories: "QuestionnaireCategory",
  templates: "Template",
};

function normalize(value) {
  return String(value || "")
    .replace(/[&]/g, "and")
    .replace(/[^a-z0-9]+/gi, " ")
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
  const settingsPath = path.resolve(__dirname, "../local.settings.json");
  const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
  const connectionString = settings?.Values?.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error("AZURE_STORAGE_CONNECTION_STRING is not configured.");
  }
  return connectionString;
}

async function main() {
  const execute = process.argv.includes("--execute");
  const connectionString = readConnectionString();
  const clients = Object.fromEntries(
    Object.entries(TABLES).map(([key, table]) => [
      key,
      TableClient.fromConnectionString(connectionString, table),
    ])
  );

  const [tops, middles, parents, categories, templates] = await Promise.all([
    listPartition(clients.tops, "TopCategory"),
    listPartition(clients.middles, "MiddleCategory"),
    listPartition(clients.parents, "ParentCategory"),
    listPartition(clients.categories, "Category"),
    listPartition(clients.templates, "Template"),
  ]);

  const topById = new Map(tops.map((item) => [item.rowKey, item]));
  const middleById = new Map(middles.map((item) => [item.rowKey, item]));
  const parentById = new Map(parents.map((item) => [item.rowKey, item]));

  // The master template defines the categories we keep.
  const keepIds = new Set(
    templates
      .filter((item) => /master organizational development/i.test(item.TemplateName || ""))
      .flatMap((item) => parseIds(item.CategoryId))
  );

  if (keepIds.size === 0) {
    throw new Error("Master Organizational Development template was not found.");
  }

  function describe(category) {
    const parent = parentById.get(category.ParentCategoryId);
    const middle = parent ? middleById.get(parent.MiddleCategoryId) : null;
    const top = middle ? topById.get(middle.TopCategoryId) : null;
    return {
      id: category.rowKey,
      name: category.CategoryName || "",
      path: [
        top?.TopCategoryName,
        middle?.MiddleCategoryName,
        parent?.ParentCategoryName,
        category.CategoryName,
      ]
        .filter(Boolean)
        .join(" > "),
      questionIds: parseIds(category.QuestionId),
      entity: category,
    };
  }

  const described = categories.map(describe);
  const keepByName = new Map();
  for (const category of described) {
    if (keepIds.has(category.id)) {
      keepByName.set(normalize(category.name), category);
    }
  }

  const templateQuestionIds = new Set(
    templates
      .filter((item) => /master organizational development/i.test(item.TemplateName || ""))
      .flatMap((item) => parseIds(item.QuestionIds))
  );

  const merges = [];
  for (const category of described) {
    if (keepIds.has(category.id)) continue;
    const target = keepByName.get(normalize(category.name));
    if (!target) continue;

    const unmatched = category.questionIds.filter(
      (id) => !target.questionIds.includes(id)
    );
    // Questions outside the master template are pre-existing test data, so
    // they are left unassigned instead of polluting a master category.
    const movedQuestionIds = unmatched.filter((id) =>
      templateQuestionIds.has(id)
    );
    const unassignedQuestionIds = unmatched.filter(
      (id) => !templateQuestionIds.has(id)
    );
    merges.push({
      from: category,
      into: target,
      movedQuestionIds,
      unassignedQuestionIds,
    });
  }

  const targetUpdates = new Map();
  for (const merge of merges) {
    const current =
      targetUpdates.get(merge.into.id) || [...merge.into.questionIds];
    for (const id of merge.movedQuestionIds) {
      if (!current.includes(id)) current.push(id);
    }
    targetUpdates.set(merge.into.id, current);
  }

  const summary = {
    mode: execute ? "EXECUTE" : "DRY RUN",
    duplicateCategoriesRemoved: merges.length,
    questionsMoved: merges.reduce(
      (total, merge) => total + merge.movedQuestionIds.length,
      0
    ),
    questionsLeftUnassigned: merges.flatMap(
      (merge) => merge.unassignedQuestionIds
    ),
    merges: merges.map((merge) => ({
      removing: { id: merge.from.id, path: merge.from.path },
      keeping: { id: merge.into.id, path: merge.into.path },
      movedQuestionIds: merge.movedQuestionIds,
      unassignedQuestionIds: merge.unassignedQuestionIds,
    })),
  };

  console.log(JSON.stringify(summary, null, 2));
  if (!execute || merges.length === 0) return;

  const now = new Date().toISOString();
  const backupPath = path.resolve(
    __dirname,
    `../../../category-merge-backup-${now.replace(/[:.]/g, "-")}.json`
  );
  fs.writeFileSync(
    backupPath,
    JSON.stringify({ createdAt: now, categories, templates }, null, 2)
  );

  for (const [categoryId, questionIds] of targetUpdates) {
    const target = described.find((item) => item.id === categoryId);
    await clients.categories.updateEntity(
      {
        partitionKey: "Category",
        rowKey: categoryId,
        QuestionId: questionIds.join(","),
        ModifiedBy: "Duplicate category merge",
        ModifiedDate: now,
      },
      "Merge"
    );
    target.questionIds = questionIds;
  }

  for (const merge of merges) {
    await clients.categories.deleteEntity("Category", merge.from.id);
  }

  // Drop now-empty parent/middle/top levels left behind by the merge.
  const remaining = await listPartition(clients.categories, "Category");
  const usedParents = new Set(remaining.map((item) => item.ParentCategoryId));
  const orphanParents = parents.filter((item) => !usedParents.has(item.rowKey));
  for (const parent of orphanParents) {
    await clients.parents.deleteEntity("ParentCategory", parent.rowKey);
  }

  const usedMiddles = new Set(
    parents
      .filter((item) => usedParents.has(item.rowKey))
      .map((item) => item.MiddleCategoryId)
  );
  const orphanMiddles = middles.filter((item) => !usedMiddles.has(item.rowKey));
  for (const middle of orphanMiddles) {
    await clients.middles.deleteEntity("MiddleCategory", middle.rowKey);
  }

  const usedTops = new Set(
    middles
      .filter((item) => usedMiddles.has(item.rowKey))
      .map((item) => item.TopCategoryId)
  );
  const orphanTops = tops.filter((item) => !usedTops.has(item.rowKey));
  for (const top of orphanTops) {
    await clients.tops.deleteEntity("TopCategory", top.rowKey);
  }

  console.log(
    JSON.stringify(
      {
        success: true,
        backupPath,
        removedParentCategories: orphanParents.map((item) => item.rowKey),
        removedMiddleCategories: orphanMiddles.map((item) => item.rowKey),
        removedTopCategories: orphanTops.map((item) => item.rowKey),
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
