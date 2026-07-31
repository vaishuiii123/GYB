const {
  getTableClient,
  listPartition,
  getEntitiesByKeys,
  groupOptionsByQuestionIds,
  listAnswersForWorkshop,
} = require("../shared/tableHelper");
const { getWorkshopById } = require("../shared/workshopAccess");

function parseQuestionIds(questionIdField) {
  if (!questionIdField) {
    return [];
  }

  return String(questionIdField)
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
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

    let resolvedTemplateId = templateId || "";

    if (!resolvedTemplateId && workshopId) {
      const workshop = await getWorkshopById(workshopId);
      resolvedTemplateId = workshop?.templateId || "";
    }

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

    const [questionEntities, tags] = await Promise.all([
      getEntitiesByKeys(questionTable, "Question", questionIds),
      listPartition(tagTable, "Tag"),
    ]);

    const tagColorById = new Map(
      tags.map((tag) => [tag.rowKey, tag.TagColor || "#9B304A"])
    );
    const tagNameById = new Map(
      tags.map((tag) => [tag.rowKey, tag.TagName || ""])
    );

    const needsOptions = questionEntities.some(
      (question) => String(question.QuestionType || "Text") !== "Text"
    );

    const [allOptions, answerPayload] = await Promise.all([
      needsOptions
        ? listPartition(optionTable, "QuestionOption")
        : Promise.resolve([]),
      participantId && workshopId
        ? listAnswersForWorkshop(
            getTableClient("QuestionAnswer"),
            participantId,
            workshopId
          )
        : Promise.resolve(null),
    ]);

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
