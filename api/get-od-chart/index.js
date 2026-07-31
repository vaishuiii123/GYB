const { getTableClient, listPartition } = require("../shared/tableHelper");

function parseIds(value) {
  if (!value) {
    return [];
  }

  return String(value)
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

const DEFAULT_TAG_COLOR = "#9B304A";

module.exports = async function (context, req) {
  try {
    const templateId = req.query.templateId;
    const includeQuestions = req.query.includeQuestions === "true";

    if (!templateId) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "templateId is required.",
        },
      };
      return;
    }

    const templateClient = getTableClient("Template");
    const categoryClient = getTableClient("QuestionnaireCategory");
    const parentClient = getTableClient("QuestionnaireParentCategory");
    const middleClient = getTableClient("QuestionnaireMiddleCategory");
    const topClient = getTableClient("QuestionnaireTopCategory");
    const tagClient = getTableClient("Tags");

    let template;

    try {
      template = await templateClient.getEntity("Template", templateId);
    } catch {
      context.res = {
        status: 404,
        body: {
          success: false,
          message: "Template not found.",
        },
      };
      return;
    }

    const templateQuestionIds = new Set(parseIds(template.QuestionIds));

    const [tops, middles, parents, categories, tags] = await Promise.all([
      listPartition(topClient, "TopCategory"),
      listPartition(middleClient, "MiddleCategory"),
      listPartition(parentClient, "ParentCategory"),
      listPartition(categoryClient, "Category"),
      listPartition(tagClient, "Tag"),
    ]);

    const tagColorById = new Map(
      tags.map((tag) => [tag.rowKey, tag.TagColor || DEFAULT_TAG_COLOR])
    );

    let questionMap = new Map();
    let optionsByQuestionId = new Map();

    if (includeQuestions) {
      const questionClient = getTableClient("Questions");
      const optionClient = getTableClient("QuestionOptions");
      const [allQuestions, allOptions] = await Promise.all([
        listPartition(questionClient, "Question"),
        listPartition(optionClient, "QuestionOption"),
      ]);

      questionMap = new Map(allQuestions.map((item) => [item.rowKey, item]));
      optionsByQuestionId = new Map();

      for (const opt of allOptions) {
        const questionId = opt.QuestionId;
        if (!questionId) {
          continue;
        }

        if (!optionsByQuestionId.has(questionId)) {
          optionsByQuestionId.set(questionId, []);
        }

        optionsByQuestionId.get(questionId).push(opt.OptionText);
      }
    }

    const categoriesByParentId = new Map();

    for (const category of categories) {
      const parentId = category.ParentCategoryId;
      if (!parentId) {
        continue;
      }

      if (!categoriesByParentId.has(parentId)) {
        categoriesByParentId.set(parentId, []);
      }

      categoriesByParentId.get(parentId).push(category);
    }

    function buildLeaf(category, top, middle, parent) {
      const categoryQuestionIds = parseIds(category.QuestionId);
      const assignedQuestionIds = categoryQuestionIds.filter((id) =>
        templateQuestionIds.has(id)
      );

      let questions = [];

      if (includeQuestions) {
        questions = assignedQuestionIds
          .map((questionId) => {
            const question = questionMap.get(questionId);
            if (!question) {
              return null;
            }

            return {
              id: question.rowKey,
              question: question.QuestionText || "",
              answerType: question.QuestionType || "Text",
              tagId: question.TagId || "",
              options: optionsByQuestionId.get(questionId) || [],
            };
          })
          .filter(Boolean);
      }

      const tagId = category.TagId || "";
      const tagColor = tagId
        ? tagColorById.get(tagId) || DEFAULT_TAG_COLOR
        : DEFAULT_TAG_COLOR;

      const leaf = {
        id: category.rowKey,
        name: category.CategoryName || "",
        fullPath: [
          top.TopCategoryName,
          middle.MiddleCategoryName,
          parent.ParentCategoryName,
          category.CategoryName,
        ]
          .filter(Boolean)
          .join(" > "),
        tagId,
        tagColor,
        hasAssignedQuestions: assignedQuestionIds.length > 0,
        assignedQuestionCount: assignedQuestionIds.length,
      };

      if (includeQuestions) {
        leaf.questions = questions;
      }

      return leaf;
    }

    const topsArray = tops
      .map((top) => {
        const topMiddles = middles
          .filter((middle) => middle.TopCategoryId === top.rowKey)
          .map((middle) => {
            const middleParents = parents
              .filter((parent) => parent.MiddleCategoryId === middle.rowKey)
              .map((parent) => {
                const parentCategories =
                  categoriesByParentId.get(parent.rowKey) || [];

                const leaves = parentCategories
                  .map((category) =>
                    buildLeaf(category, top, middle, parent)
                  )
                  .sort((a, b) => a.name.localeCompare(b.name));

                return {
                  id: parent.rowKey,
                  name: parent.ParentCategoryName || "",
                  leaves,
                };
              })
              .sort((a, b) => a.name.localeCompare(b.name));

            return {
              id: middle.rowKey,
              name: middle.MiddleCategoryName || "",
              parents: middleParents,
            };
          })
          .sort((a, b) => a.name.localeCompare(b.name));

        return {
          id: top.rowKey,
          name: top.TopCategoryName || "",
          middles: topMiddles,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    context.res = {
      status: 200,
      body: {
        success: true,
        template: {
          id: template.rowKey,
          templateName: template.TemplateName || "",
        },
        tops: topsArray,
      },
    };
  } catch (error) {
    context.log(error);

    context.res = {
      status: 500,
      body: {
        success: false,
        error: error.message,
      },
    };
  }
};
