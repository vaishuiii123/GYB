const {
  getTableClient,
  escapeODataValue,
  getEntitiesByKeys,
  groupOptionsByQuestionIds,
  listAnswersForWorkshop,
} = require("../shared/tableHelper");
const {
  parseQuestionIds,
  resolveOdTemplate,
} = require("../shared/resolveOdTemplate");

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

    const categoryTable = getTableClient("QuestionnaireCategory");
    const questionTable = getTableClient("Questions");
    const optionTable = getTableClient("QuestionOptions");
    const tagTable = getTableClient("Tags");

    const category = await categoryTable.getEntity("Category", categoryId);
    const categoryQuestionIds = parseQuestionIds(category.QuestionId);
    let questionIds = categoryQuestionIds;

    // Participant / workshop: only questions included on the OD template.
    const isParticipantContext = Boolean(
      participantId || workshopId || templateIdQuery
    );

    if (isParticipantContext) {
      const resolved = await resolveOdTemplate(workshopId, templateIdQuery);

      if (!resolved.templateId || !resolved.template) {
        context.res = {
          status: 400,
          body: {
            success: false,
            message:
              "Workshop OD template is missing or could not be loaded. Assign Master OD template to the workshop.",
            data: [],
          },
        };
        return;
      }

      const templateQuestionIds = parseQuestionIds(
        resolved.template.QuestionIds
      );
      const categorySet = new Set(categoryQuestionIds);

      // Template is source of truth — intersect with this leaf category.
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
