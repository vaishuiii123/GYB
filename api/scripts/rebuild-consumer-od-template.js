const fs = require("fs");
const path = require("path");
const { TableClient } = require("@azure/data-tables");
const XLSX = require("../../frontend/node_modules/xlsx");

const TEMPLATE_NAME = "Consumer OD template";
const API_BASE = process.env.GYB_API_BASE || "http://127.0.0.1:7071/api";
const CREATED_BY = "Consumer OD rebuild";

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

function mapFormat(formatRaw) {
  const format = text(formatRaw);
  const lower = format.toLowerCase();
  if (!format || lower === "textual answer" || lower === "text") {
    return { questionType: "Text", options: [] };
  }
  if (lower === "yes/ no/ others" || lower === "yes/no/others") {
    return { questionType: "Single Choice", options: ["Yes", "No", "Others"] };
  }
  if (lower === "online first/ offline first") {
    return {
      questionType: "Single Choice",
      options: ["Online first", "Offline first"],
    };
  }
  if (lower.includes("mass") && lower.includes("luxury")) {
    return {
      questionType: "Single Choice",
      options: ["Mass", "Masstige", "Premium", "Luxury"],
    };
  }
  // Fallback: treat slash/comma-separated formats as single-choice options.
  const options = format
    .split(/[,/]/)
    .map((item) => text(item))
    .filter(Boolean);
  if (options.length > 1) {
    return { questionType: "Single Choice", options };
  }
  return { questionType: "Text", options: [] };
}

function readWorkbook(workbookPath) {
  const workbook = XLSX.readFile(workbookPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  if (rows.length === 0) throw new Error("The workbook has no question rows.");
  return rows.map((row, index) => {
    const format = mapFormat(row["Format (for additional questions)"]);
    const parsed = {
      sourceRow: index + 2,
      top: text(row["Topmost category"]),
      middle: text(row["Middle Category"]),
      parent: text(row["Parent Category"]),
      category: text(row.Category),
      question: text(row.Question),
      tag: text(row.Tag),
      questionType: format.questionType,
      options: format.options,
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

async function apiPost(route, body) {
  const response = await fetch(`${API_BASE}/${route}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(
      `${route}: ${data.message || data.error || `HTTP ${response.status}`}`
    );
  }
  return data;
}

async function main() {
  const workbookPath = path.resolve(process.argv[2] || "");
  const execute = process.argv.includes("--execute");

  if (!workbookPath || !fs.existsSync(workbookPath)) {
    throw new Error("Pass the path to the Consumer OD workbook.");
  }

  const rows = readWorkbook(workbookPath);
  const connectionString = readConnectionString();
  const clients = {
    tags: TableClient.fromConnectionString(connectionString, "Tags"),
    tops: TableClient.fromConnectionString(
      connectionString,
      "QuestionnaireTopCategory"
    ),
    middles: TableClient.fromConnectionString(
      connectionString,
      "QuestionnaireMiddleCategory"
    ),
    parents: TableClient.fromConnectionString(
      connectionString,
      "QuestionnaireParentCategory"
    ),
    categories: TableClient.fromConnectionString(
      connectionString,
      "QuestionnaireCategory"
    ),
    questions: TableClient.fromConnectionString(connectionString, "Questions"),
    options: TableClient.fromConnectionString(
      connectionString,
      "QuestionOptions"
    ),
    templates: TableClient.fromConnectionString(connectionString, "Template"),
  };

  const [tags, tops, middles, parents, categories, questions, templates] =
    await Promise.all([
      listPartition(clients.tags, "Tag"),
      listPartition(clients.tops, "TopCategory"),
      listPartition(clients.middles, "MiddleCategory"),
      listPartition(clients.parents, "ParentCategory"),
      listPartition(clients.categories, "Category"),
      listPartition(clients.questions, "Question"),
      listPartition(clients.templates, "Template"),
    ]);

  const now = new Date().toISOString();
  const nextTagId = nextId("TAG", tags);
  const nextTopId = nextId("TOP", tops);
  const nextMiddleId = nextId("MID", middles);
  const nextParentId = nextId("PAR", parents);
  const nextCategoryId = nextId("CAT", categories);
  const nextQuestionId = nextId("Q", questions);
  const nextOptionId = nextId(
    "OPT",
    await listPartition(clients.options, "QuestionOption")
  );

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

  const created = {
    tags: [],
    tops: [],
    middles: [],
    parents: [],
    categories: [],
    questions: [],
    options: [],
  };
  const categoryAssignments = new Map();
  const orderedCategoryIds = [];
  const orderedQuestionIds = [];
  const optionPlans = [];

  for (const row of rows) {
    let tag = row.tag ? tagByName.get(normalize(row.tag)) : null;
    if (row.tag && !tag) {
      tag = {
        partitionKey: "Tag",
        rowKey: nextTagId(),
        TagName: row.tag,
        TagColor: "Blue",
        CreatedBy: CREATED_BY,
        CreatedDate: now,
        ModifiedBy: CREATED_BY,
        ModifiedDate: now,
      };
      tagByName.set(normalize(row.tag), tag);
      created.tags.push(tag);
    }

    let top = topByName.get(normalize(row.top));
    if (!top) {
      top = {
        partitionKey: "TopCategory",
        rowKey: nextTopId(),
        TopCategoryName: row.top,
        CreatedBy: CREATED_BY,
        CreatedDate: now,
        ModifiedBy: CREATED_BY,
        ModifiedDate: now,
      };
      topByName.set(normalize(row.top), top);
      created.tops.push(top);
    }

    const middleKey = `${top.rowKey}|${normalize(row.middle)}`;
    let middle = middleByPath.get(middleKey);
    if (!middle) {
      middle = {
        partitionKey: "MiddleCategory",
        rowKey: nextMiddleId(),
        MiddleCategoryName: row.middle,
        TopCategoryId: top.rowKey,
        CreatedBy: CREATED_BY,
        CreatedDate: now,
        ModifiedBy: CREATED_BY,
        ModifiedDate: now,
      };
      middleByPath.set(middleKey, middle);
      created.middles.push(middle);
    }

    const parentKey = `${middle.rowKey}|${normalize(row.parent)}`;
    let parent = parentByPath.get(parentKey);
    if (!parent) {
      parent = {
        partitionKey: "ParentCategory",
        rowKey: nextParentId(),
        ParentCategoryName: row.parent,
        MiddleCategoryId: middle.rowKey,
        CreatedBy: CREATED_BY,
        CreatedDate: now,
        ModifiedBy: CREATED_BY,
        ModifiedDate: now,
      };
      parentByPath.set(parentKey, parent);
      created.parents.push(parent);
    }

    const categoryKey = `${parent.rowKey}|${normalize(row.category)}`;
    let category = categoryByPath.get(categoryKey);
    if (!category) {
      category = {
        partitionKey: "Category",
        rowKey: nextCategoryId(),
        CategoryName: row.category,
        ParentCategoryId: parent.rowKey,
        TagId: tag?.rowKey || "",
        QuestionId: "",
        CreatedBy: CREATED_BY,
        CreatedDate: now,
        ModifiedBy: CREATED_BY,
        ModifiedDate: now,
      };
      categoryByPath.set(categoryKey, category);
      created.categories.push(category);
    }

    if (!orderedCategoryIds.includes(category.rowKey)) {
      orderedCategoryIds.push(category.rowKey);
    }
    if (!categoryAssignments.has(category.rowKey)) {
      categoryAssignments.set(category.rowKey, {
        entity: category,
        path: [row.top, row.middle, row.parent, row.category].join(" > "),
        questionIds: [],
      });
    }

    let question = questionByText.get(normalize(row.question));
    const isNew = !question;
    if (!question) {
      question = {
        partitionKey: "Question",
        rowKey: nextQuestionId(),
        QuestionText: row.question,
        QuestionType: row.questionType,
        TagId: tag?.rowKey || "",
        AttachmentsApplicable: "N",
        CreatedBy: CREATED_BY,
        CreatedDate: now,
        ModifiedBy: CREATED_BY,
        ModifiedDate: now,
      };
      questionByText.set(normalize(row.question), question);
      created.questions.push(question);
    }

    if (!orderedQuestionIds.includes(question.rowKey)) {
      orderedQuestionIds.push(question.rowKey);
    }
    const assignment = categoryAssignments.get(category.rowKey);
    if (!assignment.questionIds.includes(question.rowKey)) {
      assignment.questionIds.push(question.rowKey);
    }

    if (row.options.length > 0) {
      optionPlans.push({
        questionId: question.rowKey,
        options: row.options,
        isNew,
        questionType: row.questionType,
        updateType: !isNew && question.QuestionType !== row.questionType,
      });
    } else if (!isNew && question.QuestionType !== row.questionType) {
      optionPlans.push({
        questionId: question.rowKey,
        options: [],
        isNew: false,
        questionType: row.questionType,
        updateType: true,
      });
    }
  }

  const existingTemplate = templates.find(
    (item) => normalize(item.TemplateName) === normalize(TEMPLATE_NAME)
  );
  const categoryNames = orderedCategoryIds.map(
    (id) => categoryAssignments.get(id).entity.CategoryName
  );
  const categoryPaths = orderedCategoryIds.map(
    (id) => categoryAssignments.get(id).path
  );

  const summary = {
    mode: execute ? "EXECUTE" : "DRY RUN",
    sourceRows: rows.length,
    uniqueQuestions: orderedQuestionIds.length,
    categories: orderedCategoryIds.length,
    createdCounts: {
      tags: created.tags.length,
      tops: created.tops.length,
      middles: created.middles.length,
      parents: created.parents.length,
      categories: created.categories.length,
      questions: created.questions.length,
      optionSets: optionPlans.filter((item) => item.options.length > 0).length,
    },
    existingTemplateId: existingTemplate?.rowKey || null,
    action: existingTemplate ? "update" : "create",
    templateName: TEMPLATE_NAME,
  };

  console.log(JSON.stringify(summary, null, 2));
  if (!execute) return;

  for (const entity of created.tags) await clients.tags.createEntity(entity);
  for (const entity of created.tops) await clients.tops.createEntity(entity);
  for (const entity of created.middles)
    await clients.middles.createEntity(entity);
  for (const entity of created.parents)
    await clients.parents.createEntity(entity);
  for (const entity of created.categories)
    await clients.categories.createEntity(entity);
  for (const entity of created.questions)
    await clients.questions.createEntity(entity);

  for (const plan of optionPlans) {
    if (plan.updateType) {
      await clients.questions.updateEntity(
        {
          partitionKey: "Question",
          rowKey: plan.questionId,
          QuestionType: plan.questionType,
          ModifiedBy: CREATED_BY,
          ModifiedDate: now,
        },
        "Merge"
      );
    }
    if (plan.options.length > 0) {
      // Replace existing options for this question.
      for await (const option of clients.options.listEntities({
        queryOptions: {
          filter: `PartitionKey eq 'QuestionOption' and QuestionId eq '${plan.questionId}'`,
        },
      })) {
        await clients.options.deleteEntity(option.partitionKey, option.rowKey);
      }
      for (const optionText of plan.options) {
        const optionId = nextOptionId();
        await clients.options.createEntity({
          partitionKey: "QuestionOption",
          rowKey: optionId,
          QuestionId: plan.questionId,
          OptionText: optionText,
          CreatedBy: CREATED_BY,
          CreatedDate: now,
        });
        created.options.push(optionId);
      }
    }
  }

  // Assign only these consumer questions to the involved categories
  // without removing unrelated master-template questions already linked.
  for (const [categoryId, assignment] of categoryAssignments) {
    const current = parseIds(assignment.entity.QuestionId || "");
    const merged = [...current];
    for (const questionId of assignment.questionIds) {
      if (!merged.includes(questionId)) merged.push(questionId);
    }
    await clients.categories.updateEntity(
      {
        partitionKey: "Category",
        rowKey: categoryId,
        QuestionId: merged.join(","),
        ModifiedBy: CREATED_BY,
        ModifiedDate: now,
      },
      "Merge"
    );
  }

  const payload = {
    templateName: TEMPLATE_NAME,
    categoryIds: orderedCategoryIds,
    categoryNames,
    categoryPaths,
    questionIds: orderedQuestionIds,
    createdBy: CREATED_BY,
    modifiedBy: CREATED_BY,
  };

  const data = existingTemplate
    ? await apiPost("update-template", {
        ...payload,
        templateId: existingTemplate.rowKey,
      })
    : await apiPost("create-template", payload);

  console.log(
    JSON.stringify(
      {
        success: true,
        templateId: data.templateId || existingTemplate?.rowKey,
        action: existingTemplate ? "updated" : "created",
        questionCount: orderedQuestionIds.length,
        optionsCreated: created.options.length,
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
