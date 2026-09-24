const fs = require("fs");
const path = require("path");
const { TableClient } = require("@azure/data-tables");

function resolveXlsx() {
  const candidates = [
    path.resolve(__dirname, "../../frontend/node_modules/xlsx"),
    path.resolve(
      "C:/Users/VaishnaviSapkal/Downloads/GYB-main_GYB/GYB-main/frontend/node_modules/xlsx"
    ),
    path.resolve(
      "C:/Users/VaishnaviSapkal/Downloads/GYB/frontend/node_modules/xlsx"
    ),
  ];
  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {
      // try next
    }
  }
  return require("xlsx");
}

const XLSX = resolveXlsx();

const TEMPLATE_NAME = "Master Organizational Development template";
const PARTITIONS = {
  tags: "Tag",
  tops: "TopCategory",
  middles: "MiddleCategory",
  parents: "ParentCategory",
  categories: "Category",
  questions: "Question",
  templates: "Template",
};
const TABLES = {
  tags: "Tags",
  tops: "QuestionnaireTopCategory",
  middles: "QuestionnaireMiddleCategory",
  parents: "QuestionnaireParentCategory",
  categories: "QuestionnaireCategory",
  questions: "Questions",
  templates: "Template",
  preOdTemplates: "PreODTemplate",
};
const NEW_TAG_COLORS = {
  "all process groupings": "DarkGoldenrod",
  "it strategy & management": "Teal",
};
const FALLBACK_COLORS = [
  "Green",
  "Orange",
  "Maroon",
  "DarkGoldenrod",
  "Teal",
  "Brown",
];

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

function parseIds(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function nextId(prefix, entities) {
  let max = 0;
  for (const entity of entities) {
    const value = Number.parseInt(
      String(entity.rowKey || "").replace(prefix, ""),
      10
    );
    if (Number.isFinite(value)) max = Math.max(max, value);
  }
  return () => `${prefix}${String(++max).padStart(3, "0")}`;
}

async function listPartition(client, partitionKey) {
  const result = [];
  for await (const entity of client.listEntities({
    queryOptions: {
      filter: `PartitionKey eq '${partitionKey}'`,
    },
  })) {
    result.push(entity);
  }
  return result;
}

function chunks(items, size = 80) {
  const result = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

async function submitUpserts(client, entities) {
  for (const batch of chunks(entities)) {
    await client.submitTransaction(
      batch.map((entity) => ["upsert", entity, "Merge"])
    );
  }
}

function readConnectionString() {
  if (process.env.AZURE_STORAGE_CONNECTION_STRING) {
    return process.env.AZURE_STORAGE_CONNECTION_STRING;
  }

  const settingsCandidates = [
    path.resolve(__dirname, "../local.settings.json"),
    path.resolve("C:/Users/VaishnaviSapkal/Downloads/GYB/api/local.settings.json"),
    path.resolve(
      "C:/Users/VaishnaviSapkal/Downloads/GYB-main_GYB/GYB-main/api/local.settings.json"
    ),
  ];

  for (const settingsPath of settingsCandidates) {
    if (!fs.existsSync(settingsPath)) continue;
    const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    const connectionString =
      settings?.Values?.AZURE_STORAGE_CONNECTION_STRING;
    if (connectionString) {
      return connectionString;
    }
  }

  throw new Error("AZURE_STORAGE_CONNECTION_STRING is not configured.");
}

function readWorkbook(workbookPath) {
  const workbook = XLSX.readFile(workbookPath);
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) throw new Error("The workbook has no sheets.");

  const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
  const required = [
    "Topmost category",
    "Middle Category",
    "Parent Category",
    "Category",
    "Question",
    "Tag",
  ];

  if (rows.length === 0) throw new Error("The workbook has no question rows.");
  for (const column of required) {
    if (!(column in rows[0])) {
      throw new Error(`Missing required workbook column: ${column}`);
    }
  }

  return rows.map((row, index) => {
    const parsed = {
      sourceRow: index + 2,
      top: text(row["Topmost category"]),
      middle: text(row["Middle Category"]),
      parent: text(row["Parent Category"]),
      category: text(row.Category),
      question: text(row.Question),
      tag: text(row.Tag),
    };
    if (
      !parsed.top ||
      !parsed.middle ||
      !parsed.parent ||
      !parsed.category ||
      !parsed.question
    ) {
      throw new Error(`Required data is missing on workbook row ${index + 2}.`);
    }
    return parsed;
  });
}

function clientFor(connectionString, tableName) {
  return TableClient.fromConnectionString(connectionString, tableName);
}

async function main() {
  const workbookPath = path.resolve(process.argv[2] || "");
  const execute = process.argv.includes("--execute");
  const verifyOnly = process.argv.includes("--verify");

  if (!workbookPath || !fs.existsSync(workbookPath)) {
    throw new Error("Pass the path to the Master OD workbook.");
  }

  const rows = readWorkbook(workbookPath);
  const connectionString = readConnectionString();
  const clients = Object.fromEntries(
    Object.entries(TABLES).map(([key, tableName]) => [
      key,
      clientFor(connectionString, tableName),
    ])
  );

  const [
    tags,
    tops,
    middles,
    parents,
    categories,
    questions,
    templates,
    preOdTemplates,
  ] = await Promise.all([
    listPartition(clients.tags, PARTITIONS.tags),
    listPartition(clients.tops, PARTITIONS.tops),
    listPartition(clients.middles, PARTITIONS.middles),
    listPartition(clients.parents, PARTITIONS.parents),
    listPartition(clients.categories, PARTITIONS.categories),
    listPartition(clients.questions, PARTITIONS.questions),
    listPartition(clients.templates, PARTITIONS.templates),
    listPartition(clients.preOdTemplates, "PreODTemplate"),
  ]);

  const original = {
    tags,
    tops,
    middles,
    parents,
    categories,
    questions,
    templates,
    preOdTemplates,
  };
  const now = new Date().toISOString();
  const createdBy = "Master OD workbook import";

  const nextTagId = nextId("TAG", tags);
  const nextTopId = nextId("TOP", tops);
  const nextMiddleId = nextId("MID", middles);
  const nextParentId = nextId("PAR", parents);
  const nextCategoryId = nextId("CAT", categories);
  const nextQuestionId = nextId("Q", questions);

  const tagByName = new Map(tags.map((item) => [normalize(item.TagName), item]));
  const topByName = new Map(
    tops.map((item) => [normalize(item.TopCategoryName), item])
  );
  const middleByPath = new Map(
    middles.map((item) => [
      `${item.TopCategoryId}|${normalize(item.MiddleCategoryName)}`,
      item,
    ])
  );
  const parentByPath = new Map(
    parents.map((item) => [
      `${item.MiddleCategoryId}|${normalize(item.ParentCategoryName)}`,
      item,
    ])
  );
  const categoryByPath = new Map(
    categories.map((item) => [
      `${item.ParentCategoryId}|${normalize(item.CategoryName)}`,
      item,
    ])
  );
  const questionByText = new Map(
    questions.map((item) => [normalize(item.QuestionText), item])
  );

  const newTags = [];
  const newTops = [];
  const newMiddles = [];
  const newParents = [];
  const categoryPlans = new Map();
  const questionPlans = new Map();
  const orderedCategoryIds = [];
  const orderedQuestions = [];

  for (const row of rows) {
    let tag = row.tag ? tagByName.get(normalize(row.tag)) : null;
    if (row.tag && !tag) {
      const normalizedTag = normalize(row.tag);
      tag = {
        partitionKey: PARTITIONS.tags,
        rowKey: nextTagId(),
        TagName: row.tag,
        TagColor:
          NEW_TAG_COLORS[normalizedTag] ||
          FALLBACK_COLORS[newTags.length % FALLBACK_COLORS.length],
        CreatedBy: createdBy,
        CreatedDate: now,
        ModifiedBy: createdBy,
        ModifiedDate: now,
      };
      tagByName.set(normalizedTag, tag);
      newTags.push(tag);
    }

    let top = topByName.get(normalize(row.top));
    if (!top) {
      top = {
        partitionKey: PARTITIONS.tops,
        rowKey: nextTopId(),
        TopCategoryName: row.top,
        CreatedBy: createdBy,
        CreatedDate: now,
        ModifiedBy: createdBy,
        ModifiedDate: now,
      };
      topByName.set(normalize(row.top), top);
      newTops.push(top);
    }

    const middleKey = `${top.rowKey}|${normalize(row.middle)}`;
    let middle = middleByPath.get(middleKey);
    if (!middle) {
      middle = {
        partitionKey: PARTITIONS.middles,
        rowKey: nextMiddleId(),
        MiddleCategoryName: row.middle,
        TopCategoryId: top.rowKey,
        CreatedBy: createdBy,
        CreatedDate: now,
        ModifiedBy: createdBy,
        ModifiedDate: now,
      };
      middleByPath.set(middleKey, middle);
      newMiddles.push(middle);
    }

    const parentKey = `${middle.rowKey}|${normalize(row.parent)}`;
    let parent = parentByPath.get(parentKey);
    if (!parent) {
      parent = {
        partitionKey: PARTITIONS.parents,
        rowKey: nextParentId(),
        ParentCategoryName: row.parent,
        MiddleCategoryId: middle.rowKey,
        CreatedBy: createdBy,
        CreatedDate: now,
        ModifiedBy: createdBy,
        ModifiedDate: now,
      };
      parentByPath.set(parentKey, parent);
      newParents.push(parent);
    }

    const categoryKey = `${parent.rowKey}|${normalize(row.category)}`;
    let category = categoryByPath.get(categoryKey);
    if (!category) {
      category = {
        partitionKey: PARTITIONS.categories,
        rowKey: nextCategoryId(),
        CategoryName: row.category,
        ParentCategoryId: parent.rowKey,
        TagId: tag?.rowKey || "",
        QuestionId: "",
        CreatedBy: createdBy,
        CreatedDate: now,
        ModifiedBy: createdBy,
        ModifiedDate: now,
      };
      categoryByPath.set(categoryKey, category);
    }
    if (!orderedCategoryIds.includes(category.rowKey)) {
      orderedCategoryIds.push(category.rowKey);
    }

    let categoryPlan = categoryPlans.get(category.rowKey);
    if (!categoryPlan) {
      categoryPlan = {
        entity: category,
        questionIds: new Set(parseIds(category.QuestionId)),
        tagCounts: new Map(),
        path: [row.top, row.middle, row.parent, row.category].join(" > "),
      };
      categoryPlans.set(category.rowKey, categoryPlan);
    }
    if (tag?.rowKey) {
      categoryPlan.tagCounts.set(
        tag.rowKey,
        (categoryPlan.tagCounts.get(tag.rowKey) || 0) + 1
      );
    }

    const questionKey = normalize(row.question);
    let question = questionByText.get(questionKey);
    if (!question) {
      question = {
        partitionKey: PARTITIONS.questions,
        rowKey: nextQuestionId(),
        QuestionText: row.question,
        QuestionType: "Rating",
        TagId: tag?.rowKey || "",
        AttachmentsApplicable: "N",
        CreatedBy: createdBy,
        CreatedDate: now,
        ModifiedBy: createdBy,
        ModifiedDate: now,
      };
      questionByText.set(questionKey, question);
    }

    if (!questionPlans.has(question.rowKey)) {
      questionPlans.set(question.rowKey, {
        partitionKey: PARTITIONS.questions,
        rowKey: question.rowKey,
        QuestionText: row.question,
        QuestionType: "Rating",
        TagId: tag?.rowKey || question.TagId || "",
        AttachmentsApplicable: question.AttachmentsApplicable || "N",
        CreatedBy: question.CreatedBy || createdBy,
        CreatedDate: question.CreatedDate || now,
        ModifiedBy: createdBy,
        ModifiedDate: now,
      });
      orderedQuestions.push(question.rowKey);
    } else {
      // Keep Master OD questions as Red/Yellow/Green Rating.
      const plan = questionPlans.get(question.rowKey);
      plan.QuestionType = "Rating";
      plan.ModifiedBy = createdBy;
      plan.ModifiedDate = now;
    }
    categoryPlan.questionIds.add(question.rowKey);
  }

  const categoryUpserts = [...categoryPlans.values()].map((plan) => {
    const mostUsedTag = [...plan.tagCounts.entries()].sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0];
    return {
      partitionKey: PARTITIONS.categories,
      rowKey: plan.entity.rowKey,
      CategoryName: plan.entity.CategoryName,
      ParentCategoryId: plan.entity.ParentCategoryId,
      TagId: mostUsedTag || plan.entity.TagId || "",
      QuestionId: [...plan.questionIds].join(","),
      CreatedBy: plan.entity.CreatedBy || createdBy,
      CreatedDate: plan.entity.CreatedDate || now,
      ModifiedBy: createdBy,
      ModifiedDate: now,
    };
  });

  const categoryPlanById = new Map(
    [...categoryPlans.entries()].map(([id, plan]) => [id, plan])
  );
  const categoryNames = orderedCategoryIds.map(
    (id) => categoryPlanById.get(id).entity.CategoryName
  );
  const categoryPaths = orderedCategoryIds.map(
    (id) => categoryPlanById.get(id).path
  );
  const odTemplates = templates.filter(
    (item) => !/pre\s*od|pre[- ]?organizational/i.test(item.TemplateName || "")
  );
  const templateId = Date.now().toString();
  const masterTemplate = {
    partitionKey: PARTITIONS.templates,
    rowKey: templateId,
    TemplateName: TEMPLATE_NAME,
    CategoryId: orderedCategoryIds.join(","),
    CategoryName: categoryNames.join(","),
    CategoryPath: categoryPaths.join("|"),
    QuestionIds: orderedQuestions.join(","),
    CreatedBy: createdBy,
    CreatedDate: now,
  };

  const summary = {
    mode: execute ? "EXECUTE" : verifyOnly ? "VERIFY" : "DRY RUN",
    sourceRows: rows.length,
    uniqueQuestionsInMaster: orderedQuestions.length,
    categoriesInMaster: orderedCategoryIds.length,
    newRecords: {
      tags: newTags.length,
      topCategories: newTops.length,
      middleCategories: newMiddles.length,
      parentCategories: newParents.length,
      categories: categoryUpserts.filter(
        (item) => !categories.some((old) => old.rowKey === item.rowKey)
      ).length,
      questions: [...questionPlans.keys()].filter(
        (id) => !questions.some((old) => old.rowKey === id)
      ).length,
    },
    updatedExistingQuestions:
      questionPlans.size -
      [...questionPlans.keys()].filter(
        (id) => !questions.some((old) => old.rowKey === id)
      ).length,
    odTemplatesToDelete: odTemplates.map((item) => ({
      id: item.rowKey,
      name: item.TemplateName,
    })),
    preOdTemplatesPreserved: preOdTemplates.length,
    tagColors: [...tagByName.values()]
      .filter((item) =>
        new Set(rows.map((row) => normalize(row.tag)).filter(Boolean)).has(
          normalize(item.TagName)
        )
      )
      .map((item) => ({
        name: item.TagName,
        color: item.TagColor,
      })),
    newTemplate: {
      id: templateId,
      name: TEMPLATE_NAME,
      questionCount: orderedQuestions.length,
      categoryCount: orderedCategoryIds.length,
    },
  };

  console.log(JSON.stringify(summary, null, 2));
  if (verifyOnly) {
    const storedMaster = odTemplates.find(
      (item) => item.TemplateName === TEMPLATE_NAME
    );
    const storedQuestionIds = parseIds(storedMaster?.QuestionIds);
    const storedCategoryIds = parseIds(storedMaster?.CategoryId);
    const checks = {
      exactlyOneOdTemplate:
        odTemplates.length === 1 && Boolean(storedMaster),
      templateName: storedMaster?.TemplateName === TEMPLATE_NAME,
      questionCount:
        storedQuestionIds.length === 200 &&
        orderedQuestions.every((id) => storedQuestionIds.includes(id)),
      categoryCount:
        storedCategoryIds.length === 31 &&
        orderedCategoryIds.every((id) => storedCategoryIds.includes(id)),
      workbookTagsExist: rows
        .filter((row) => row.tag)
        .every((row) => tagByName.has(normalize(row.tag))),
      workbookQuestionsExist: rows.every((row) =>
        questionByText.has(normalize(row.question))
      ),
      preOdTemplatesPreserved: preOdTemplates.length === 2,
    };
    const success = Object.values(checks).every(Boolean);
    console.log(JSON.stringify({ success, checks }, null, 2));
    if (!success) process.exitCode = 1;
    return;
  }
  if (!execute) return;

  const backupPath = path.resolve(
    path.dirname(workbookPath),
    `Master OD backup ${now.replace(/[:.]/g, "-")}.json`
  );
  fs.writeFileSync(
    backupPath,
    JSON.stringify(
      {
        createdAt: now,
        sourceWorkbook: workbookPath,
        tables: original,
      },
      null,
      2
    )
  );

  await submitUpserts(clients.tags, newTags);
  await submitUpserts(clients.tops, newTops);
  await submitUpserts(clients.middles, newMiddles);
  await submitUpserts(clients.parents, newParents);
  await submitUpserts(clients.questions, [...questionPlans.values()]);
  await submitUpserts(clients.categories, categoryUpserts);

  if (odTemplates.length < 80) {
    await clients.templates.submitTransaction([
      ...odTemplates.map((item) => [
        "delete",
        {
          partitionKey: PARTITIONS.templates,
          rowKey: item.rowKey,
        },
      ]),
      ["create", masterTemplate],
    ]);
  } else {
    for (const batch of chunks(odTemplates, 80)) {
      await clients.templates.submitTransaction(
        batch.map((item) => [
          "delete",
          {
            partitionKey: PARTITIONS.templates,
            rowKey: item.rowKey,
          },
        ])
      );
    }
    await clients.templates.createEntity(masterTemplate);
  }

  console.log(
    JSON.stringify(
      {
        success: true,
        backupPath,
        templateId,
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
