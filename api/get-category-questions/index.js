const {
  getTableClient,
  escapeODataValue,
  getEntitiesByKeys,
  groupOptionsByQuestionIds,
  listAnswersForWorkshop,
} = require("../shared/tableHelper");

function parseQuestionIds(questionIdField) {
  if (!questionIdField) {
    return [];
  }

  return String(questionIdField)
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

async function listOptionsForQuestionIds(optionTable, questionIds) {
  const uniqueIds = [...new Set(questionIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return [];
  }

  const optionGroups = await Promise.all(
    uniqueIds.map(async (questionId) => {
      const options = [];

      try {
        for await (const entity of optionTable.listEntities({
          queryOptions: {
            filter: `PartitionKey eq 'QuestionOption' and QuestionId eq '${escapeODataValue(
              questionId
            )}'`,
          },
        })) {
          options.push(entity);
        }
      } catch {
        // ignore missing options
      }

      return options;
    })
  );

  return optionGroups.flat();
}

module.exports = async function (context, req) {
  try {
    const categoryId = req.query.categoryId;
    const participantId = req.query.participantId;
    const workshopId = req.query.workshopId;
    const templateId = req.query.templateId;

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

    const categoryTable = getTableClient("QuestionnaireCategory");
    const questionTable = getTableClient("Questions");
    const optionTable = getTableClient("QuestionOptions");
    const tagTable = getTableClient("Tags");

    const category = await categoryTable.getEntity("Category", categoryId);
    let questionIds = parseQuestionIds(category.QuestionId);
    const resolvedTemplateId = templateId || "";

    if (workshopId || templateId) {
      if (!resolvedTemplateId) {
        questionIds = [];
      } else {
        try {
          const templateTable = getTableClient("Template");
          const template = await templateTable.getEntity(
            "Template",
            resolvedTemplateId
          );
          const templateQuestionIds = new Set(
            parseQuestionIds(template.QuestionIds)
          );

          questionIds = questionIds.filter((id) =>
            templateQuestionIds.has(id)
          );
        } catch {
          questionIds = [];
        }
      }
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
    const optionsByQuestionId = groupOptionsByQuestionIds(
      allOptions,
      questionIds
    );

    const assignedQuestions = questionIds
      .map((questionId) => {
        const question = questionMap.get(questionId);
        if (!question) {
          return null;
        }

        const tagId = question.TagId || "";

        return {
          questionId,
          questionText: question.QuestionText || "",
          questionType: question.QuestionType || "Text",
          tagId,
          tagName: tagId ? tagNameById.get(tagId) || "" : "",
          tagColor: tagId ? tagColorById.get(tagId) || "#9B304A" : "",
          attachmentsApplicable:
            String(question.AttachmentsApplicable || "N").toUpperCase() === "Y"
              ? "Y"
              : "N",
          options: optionsByQuestionId.get(questionId) || [],
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
      responseBody.attachments = answerPayload.attachments || {};
      responseBody.responseMeta = {
        organizationId: answerPayload.organizationId,
        templateId: answerPayload.templateId,
        submittedDate: answerPayload.submittedDate,
      };
    }

    context.res = {
      status: 200,
      body: responseBody,
    };
  } catch (error) {
    context.res = {
      status: 500,
      body: {
        success: false,
        message: error.message,
      },
    };
  }
};
