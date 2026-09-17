const { getTableClient, listPartition } = require("../shared/tableHelper");
const {
  parseQuestionIds,
  resolveOdTemplate,
} = require("../shared/resolveOdTemplate");
const { getOrLoad } = require("../shared/listCache");

function parseIds(value) {
  return parseQuestionIds(value);
}

const DEFAULT_TAG_COLOR = "#9B304A";

/** In-memory cache so repeated opens stay fast (Azure Functions warm instance). */
const chartMemoryCache = new Map();
const CHART_MEMORY_TTL_MS = 10 * 60 * 1000;
const CATEGORY_TREE_KEY = "od-chart:category-tree";
const categoryBuildInflight = new Map();

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

async function loadCategoryTree() {
  const categoryClient = getTableClient("QuestionnaireCategory");
  const parentClient = getTableClient("QuestionnaireParentCategory");
  const middleClient = getTableClient("QuestionnaireMiddleCategory");
  const topClient = getTableClient("QuestionnaireTopCategory");

  const [tops, middles, parents, categories] = await Promise.all([
    listPartition(topClient, "TopCategory"),
    listPartition(middleClient, "MiddleCategory"),
    listPartition(parentClient, "ParentCategory"),
    listPartition(categoryClient, "Category"),
  ]);

  return { tops, middles, parents, categories };
}

async function buildChartBody(template, includeQuestions) {
  const templateId = String(template.rowKey);
  const { value: tree } = await getOrLoad(
    CATEGORY_TREE_KEY,
    loadCategoryTree,
    10 * 60 * 1000
  );

  const { tops, middles, parents, categories } = tree;
  const templateQuestionIds = new Set(parseIds(template.QuestionIds));

  let tagColorById = new Map();
  let questionMap = new Map();
  let optionsByQuestionId = new Map();

  if (includeQuestions) {
    const [tags, allQuestions, allOptions] = await Promise.all([
      listPartition(getTableClient("Tags"), "Tag"),
      listPartition(getTableClient("Questions"), "Question"),
      listPartition(getTableClient("QuestionOptions"), "QuestionOption"),
    ]);

    tagColorById = new Map(
      (tags || []).map((tag) => [tag.rowKey, tag.TagColor || DEFAULT_TAG_COLOR])
    );
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
                .map((category) => buildLeaf(category, top, middle, parent))
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

  return {
    success: true,
    template: {
      id: templateId,
      templateName: template.TemplateName || "",
    },
    tops: topsArray,
  };
}

module.exports = async function (context, req) {
  try {
    const templateIdQuery = String(req.query.templateId || "").trim();
    const workshopId = String(req.query.workshopId || "").trim();
    const includeQuestions = req.query.includeQuestions === "true";
    const mode = includeQuestions ? "full" : "lite";

    if (!templateIdQuery && !workshopId) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "templateId or workshopId is required.",
        },
      };
      return;
    }

    // Serve from memory before any Azure round-trips when templateId is known.
    if (templateIdQuery) {
      const earlyHit = getMemoryCachedChart(`${templateIdQuery}:${mode}`);
      if (earlyHit) {
        context.res = {
          status: 200,
          headers: {
            "Cache-Control": "private, max-age=120",
            "X-List-Cache": "HIT",
          },
          body: earlyHit,
        };
        return;
      }
    }

    const resolved = await resolveOdTemplate(workshopId, templateIdQuery);
    const templateId = resolved.templateId;
    const template = resolved.template;

    if (!templateId || !template) {
      context.res = {
        status: 404,
        body: {
          success: false,
          message: "Template not found.",
        },
      };
      return;
    }

    const cacheKey = `${templateId}:${mode}`;
    const cachedBody = getMemoryCachedChart(cacheKey);
    if (cachedBody) {
      context.res = {
        status: 200,
        headers: {
          "Cache-Control": "private, max-age=120",
          "X-List-Cache": "HIT",
        },
        body: cachedBody,
      };
      return;
    }

    let body;
    const pending = categoryBuildInflight.get(cacheKey);
    if (pending) {
      body = await pending;
    } else {
      const buildPromise = buildChartBody(template, includeQuestions)
        .then((result) => {
          setMemoryCachedChart(cacheKey, result);
          categoryBuildInflight.delete(cacheKey);
          return result;
        })
        .catch((error) => {
          categoryBuildInflight.delete(cacheKey);
          throw error;
        });
      categoryBuildInflight.set(cacheKey, buildPromise);
      body = await buildPromise;
    }

    context.res = {
      status: 200,
      headers: {
        "Cache-Control": "private, max-age=120",
        "X-List-Cache": "MISS",
      },
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
