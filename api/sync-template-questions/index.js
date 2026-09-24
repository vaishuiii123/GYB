const {
  getTableClient,
  listPartition,
} = require("../shared/tableHelper");
const {
  invalidateQuestionStructure,
  invalidateCategoryStructure,
  invalidateTemplateStructure,
} = require("../shared/cacheInvalidation");

function parseIds(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

function uniqueIds(ids) {
  return [...new Set(ids.map((id) => String(id || "").trim()).filter(Boolean))];
}

module.exports = async function (context, req) {
  try {
    const templateClient = getTableClient("Template");
    const questionClient = getTableClient("Questions");
    const categoryClient = getTableClient("QuestionnaireCategory");
    const optionClient = getTableClient("QuestionOptions");

    const [templates, questions, categories, options] = await Promise.all([
      listPartition(templateClient, "Template"),
      listPartition(questionClient, "Question"),
      listPartition(categoryClient, "Category"),
      listPartition(optionClient, "QuestionOption").catch(() => []),
    ]);

    const questionById = new Map(
      questions.map((item) => [String(item.rowKey), item])
    );
    const optionsByQuestion = new Map();
    for (const option of options) {
      const questionId = String(option.QuestionId || "").trim();
      if (!questionId) continue;
      if (!optionsByQuestion.has(questionId)) {
        optionsByQuestion.set(questionId, []);
      }
      optionsByQuestion.get(questionId).push(String(option.OptionText || "").trim());
    }

    const categoryById = new Map(
      categories.map((item) => [String(item.rowKey), item])
    );

    let templateCount = 0;
    let templateQuestionRefs = 0;
    let missingInQuestionManagement = [];
    let assignedToCategory = 0;
    let alreadyLinked = 0;

    for (const template of templates) {
      templateCount += 1;
      const questionIds = uniqueIds(parseIds(template.QuestionIds));
      const categoryIds = uniqueIds(parseIds(template.CategoryId));
      templateQuestionRefs += questionIds.length;

      for (const questionId of questionIds) {
        const question = questionById.get(questionId);
        if (!question) {
          missingInQuestionManagement.push({
            templateId: template.rowKey,
            templateName: template.TemplateName || "",
            questionId,
          });
          continue;
        }

        const linkedCategoryIds = categoryIds.filter((categoryId) => {
          const category = categoryById.get(categoryId);
          if (!category) return false;
          return parseIds(category.QuestionId).includes(questionId);
        });

        if (linkedCategoryIds.length > 0) {
          alreadyLinked += 1;
          continue;
        }

        // Prefer a category that already owns this question outside the template.
        let targetCategoryId = "";
        for (const [categoryId, category] of categoryById.entries()) {
          if (parseIds(category.QuestionId).includes(questionId)) {
            targetCategoryId = categoryId;
            break;
          }
        }

        if (!targetCategoryId) {
          targetCategoryId = categoryIds[0] || "";
        }

        if (!targetCategoryId || !categoryById.has(targetCategoryId)) {
          continue;
        }

        const category = categoryById.get(targetCategoryId);
        const existingIds = parseIds(category.QuestionId);
        if (existingIds.includes(questionId)) {
          alreadyLinked += 1;
          continue;
        }

        existingIds.push(questionId);
        category.QuestionId = existingIds.join(",");
        category.ModifiedBy = "sync-template-questions";
        category.ModifiedDate = new Date().toISOString();
        await categoryClient.updateEntity(category, "Merge");
        categoryById.set(targetCategoryId, category);
        assignedToCategory += 1;
      }
    }

    // Ensure every category-linked question exists in Question Management listing
    // (identity check only — questions are the same Azure table).
    const categoryQuestionIds = uniqueIds(
      categories.flatMap((category) => parseIds(category.QuestionId))
    );
    const orphanCategoryQuestionIds = categoryQuestionIds.filter(
      (questionId) => !questionById.has(questionId)
    );

    invalidateQuestionStructure();
    invalidateCategoryStructure();
    invalidateTemplateStructure();

    context.res = {
      status: 200,
      body: {
        success: true,
        message:
          "Template questions and Question Management are synced. Edited template questions will be added as new Question Management entries going forward.",
        data: {
          templateCount,
          questionManagementCount: questions.length,
          templateQuestionRefs,
          alreadyLinked,
          assignedToCategory,
          missingInQuestionManagement: missingInQuestionManagement.length,
          missingDetails: missingInQuestionManagement.slice(0, 50),
          orphanCategoryQuestionIds: orphanCategoryQuestionIds.slice(0, 50),
          sampleQuestionIds: [...questionById.keys()].slice(0, 10),
          optionQuestionCount: optionsByQuestion.size,
        },
      },
    };
  } catch (error) {
    context.log("sync-template-questions error:", error);
    context.res = {
      status: 500,
      body: {
        success: false,
        message: error.message || "Failed to sync template questions.",
      },
    };
  }
};
