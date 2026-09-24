const {
  getTableClient,
  getEntitiesByKeys,
  groupOptionsByQuestionIds,
  listAnswersForWorkshop,
} = require("../shared/tableHelper");
const {
  parseQuestionIds,
  resolveOdTemplate,
} = require("../shared/resolveOdTemplate");
const { getOrLoad, getCached } = require("../shared/listCache");

const RESPONSE_TTL_MS = 5 * 60 * 1000;
const OPTIONS_TTL_MS = 10 * 60 * 1000;

async function loadAllQuestionOptions(optionTable) {
  const options = [];
  for await (const entity of optionTable.listEntities({
    queryOptions: {
      filter: "PartitionKey eq 'QuestionOption'",
    },
  })) {
    options.push(entity);
  }
  return options;
}

async function listOptionsForQuestionIds(optionTable, questionIds) {
  const uniqueIds = [...new Set(questionIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return [];
  }

  const { value: allOptions } = await getOrLoad(
    "question-options:all",
    () => loadAllQuestionOptions(optionTable),
    OPTIONS_TTL_MS
  );
  const wanted = new Set(uniqueIds);
  return (allOptions || []).filter((option) => wanted.has(option.QuestionId));
}

function responseCacheKey(categoryId, templateId, participantId, workshopId) {
  return `cat-questions:${categoryId}:${templateId}:${participantId}:${workshopId}`;
}

async function buildCategoryQuestionsPayload({
  categoryId,
  participantId,
  workshopId,
  templateIdQuery,
  context,
}) {
  const categoryTable = getTableClient("QuestionnaireCategory");
  const questionTable = getTableClient("Questions");
  const optionTable = getTableClient("QuestionOptions");
  const tagTable = getTableClient("Tags");

  const category = await categoryTable.getEntity("Category", categoryId);
  const categoryQuestionIds = parseQuestionIds(category.QuestionId);
  let questionIds = categoryQuestionIds;
  let resolvedTemplateId = templateIdQuery;

  const isParticipantContext = Boolean(
    participantId || workshopId || templateIdQuery
  );

  if (isParticipantContext) {
    const resolved = await resolveOdTemplate(workshopId, templateIdQuery);

    if (!resolved.templateId || !resolved.template) {
      const error = new Error(
        "Workshop OD template is missing or could not be loaded. Assign Master OD template to the workshop."
      );
      error.status = 400;
      throw error;
    }

    resolvedTemplateId = resolved.templateId;
    const templateQuestionIds = parseQuestionIds(resolved.template.QuestionIds);
    const categorySet = new Set(categoryQuestionIds);
    questionIds = templateQuestionIds.filter((id) => categorySet.has(id));

    context.log(
      `get-category-questions: category=${categoryId} ` +
        `template=${resolved.templateId} (${resolved.template.TemplateName}) ` +
        `templateQs=${templateQuestionIds.length} ` +
        `categoryQs=${categoryQuestionIds.length} result=${questionIds.length}`
    );
  }

  const questionEntities = await getEntitiesByKeys(
    questionTable,
    "Question",
    questionIds
  );

  const tagIds = [
    ...new Set(
      [
        category.TagId,
        ...questionEntities.map((question) => question.TagId),
      ].filter(Boolean)
    ),
  ];

  const needsOptions = questionEntities.some(
    (question) => String(question.QuestionType || "Text") !== "Text"
  );

  const [tagEntities, allOptions, answerPayload] = await Promise.all([
    getEntitiesByKeys(tagTable, "Tag", tagIds),
    needsOptions
      ? listOptionsForQuestionIds(optionTable, questionIds)
      : Promise.resolve([]),
    participantId && workshopId
      ? listAnswersForWorkshop(
          getTableClient("QuestionAnswer"),
          participantId,
          workshopId
        )
      : Promise.resolve(null),
  ]);

  const tagColorById = new Map(
    tagEntities.map((tag) => [tag.rowKey, tag.TagColor || "#9B304A"])
  );
  const tagNameById = new Map(
    tagEntities.map((tag) => [tag.rowKey, tag.TagName || ""])
  );
  const questionMap = new Map(
    questionEntities.map((item) => [item.rowKey, item])
  );
  const optionsByQuestionId = groupOptionsByQuestionIds(allOptions, questionIds);

  const assignedQuestions = questionIds
    .map((questionId) => {
      const question = questionMap.get(questionId);
      if (!question) {
        return null;
      }

      const tagId = question.TagId || "";
      const questionType = question.QuestionType || "Text";
      const typeLower = String(questionType).trim().toLowerCase();
      const hideOptions =
        typeLower.includes("rating") || typeLower === "text";

      return {
        questionId,
        questionText: question.QuestionText || "",
        questionType,
        tagId,
        tagName: tagId ? tagNameById.get(tagId) || "" : "",
        tagColor: tagId ? tagColorById.get(tagId) || "#9B304A" : "",
        attachmentsApplicable:
          String(question.AttachmentsApplicable || "N").toUpperCase() === "Y"
            ? "Y"
            : "N",
        options: hideOptions
          ? []
          : optionsByQuestionId.get(questionId) || [],
      };
    })
    .filter(Boolean);

  const responseBody = {
    success: true,
    data: assignedQuestions,
    categoryTagId: category.TagId || "",
    categoryTagColor: category.TagId
      ? tagColorById.get(category.TagId) || "#9B304A"
      : "",
  };

  if (answerPayload) {
    responseBody.answers = answerPayload.answers;
    responseBody.notes = answerPayload.notes || {};
    responseBody.attachments = answerPayload.attachments || {};
    responseBody.responseMeta = {
      organizationId: answerPayload.organizationId,
      templateId: answerPayload.templateId || resolvedTemplateId,
      submittedDate: answerPayload.submittedDate,
    };
  }

  return responseBody;
}

module.exports = async function (context, req) {
  try {
    const categoryId = String(req.query.categoryId || "").trim();
    const participantId = String(req.query.participantId || "").trim();
    const workshopId = String(req.query.workshopId || "").trim();
    const templateIdQuery = String(req.query.templateId || "").trim();

    if (!categoryId) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "Category ID is required.",
        },
      };
      return;
    }

    const cacheKey = responseCacheKey(
      categoryId,
      templateIdQuery,
      participantId,
      workshopId
    );

    const memoryHit = getCached(cacheKey);
    if (memoryHit) {
      context.res = {
        status: 200,
        headers: {
          "Cache-Control": "private, max-age=30",
          "X-Cache": "HIT",
        },
        body: memoryHit,
      };
      return;
    }

    const { value: responseBody, cacheHit } = await getOrLoad(
      cacheKey,
      () =>
        buildCategoryQuestionsPayload({
          categoryId,
          participantId,
          workshopId,
          templateIdQuery,
          context,
        }),
      RESPONSE_TTL_MS
    );

    context.res = {
      status: 200,
      headers: {
        "Cache-Control": "private, max-age=30",
        "X-Cache": cacheHit ? "HIT" : "MISS",
      },
      body: responseBody,
    };
  } catch (error) {
    const status = error.status || 500;
    context.res = {
      status,
      body: {
        success: false,
        message: error.message,
        ...(status === 400 ? { data: [] } : {}),
      },
    };
  }
};

module.exports.responseCacheKey = responseCacheKey;
