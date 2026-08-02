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

/** In-memory cache so repeated opens stay fast (Azure Functions warm instance). */
const chartMemoryCache = new Map();
const CHART_MEMORY_TTL_MS = 5 * 60 * 1000;

function getMemoryCachedChart(cacheKey) {
  const entry = chartMemoryCache.get(cacheKey);
  if (!entry) {
    return null;
  }

  if (Date.now() - entry.savedAt > CHART_MEMORY_TTL_MS) {
    chartMemoryCache.delete(cacheKey);
    return null;
  }

  return entry.body;
}

function setMemoryCachedChart(cacheKey, body) {
  chartMemoryCache.set(cacheKey, {
    savedAt: Date.now(),
    body,
  });
}

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

    const cacheKey = `${templateId}:${includeQuestions ? "full" : "lite"}`;
    const cachedBody = getMemoryCachedChart(cacheKey);
    if (cachedBody) {
      context.res = {
        status: 200,
        headers: { "Cache-Control": "private, max-age=60" },
        body: cachedBody,
      };
      return;
    }

    const templateClient = getTableClient("Template");
    const categoryClient = getTableClient("QuestionnaireCategory");
    const parentClient = getTableClient("QuestionnaireParentCategory");
    const middleClient = getTableClient("QuestionnaireMiddleCategory");
    const topClient = getTableClient("QuestionnaireTopCategory");

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

    // Chart overview does not need Tags / Questions tables — big win on load time.
    const tableReads = [
      listPartition(topClient, "TopCategory"),
      listPartition(middleClient, "MiddleCategory"),
      listPartition(parentClient, "ParentCategory"),
      listPartition(categoryClient, "Category"),
    ];

    if (includeQuestions) {
      tableReads.push(listPartition(getTableClient("Tags"), "Tag"));
    }

    const [tops, middles, parents, categories, tags = []] = await Promise.all(
      tableReads
    );

    const tagColorById = new Map(
      (tags || []).map((tag) => [tag.rowKey, tag.TagColor || DEFAULT_TAG_COLOR])
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

    // Index middles/parents once instead of nested filter scans.
    const middlesByTopId = new Map();
    for (const middle of middles) {
      const topId = middle.TopCategoryId;
      if (!topId) continue;
      if (!middlesByTopId.has(topId)) {
        middlesByTopId.set(topId, []);
      }
      middlesByTopId.get(topId).push(middle);
    }

    const parentsByMiddleId = new Map();
    for (const parent of parents) {
      const middleId = parent.MiddleCategoryId;
      if (!middleId) continue;
      if (!parentsByMiddleId.has(middleId)) {
        parentsByMiddleId.set(middleId, []);
      }
      parentsByMiddleId.get(middleId).push(parent);
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
        const topMiddles = (middlesByTopId.get(top.rowKey) || [])
          .map((middle) => {
            const middleParents = (parentsByMiddleId.get(middle.rowKey) || [])
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

    const body = {
      success: true,
      template: {
        id: template.rowKey,
        templateName: template.TemplateName || "",
      },
      tops: topsArray,
    };

    setMemoryCachedChart(cacheKey, body);

    context.res = {
      status: 200,
      headers: { "Cache-Control": "private, max-age=60" },
      body,
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
