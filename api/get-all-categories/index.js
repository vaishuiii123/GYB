const {
    getTableClient,
    listPartition,
} = require("../shared/tableHelper");
const {
    CACHE_KEYS,
    getOrLoad,
} = require("../shared/listCache");


function parseQuestionIds(questionIdField) {
    if (!questionIdField) return [];
    return String(questionIdField)
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
}

module.exports = async function (context, req) {
    try {
        const { value: categories, cacheHit } = await getOrLoad(
          CACHE_KEYS.allCategories,
          async () => {
        const categoryClient = getTableClient("QuestionnaireCategory");

        const parentClient = getTableClient("QuestionnaireParentCategory");

        const middleClient = getTableClient("QuestionnaireMiddleCategory");

        const topClient = getTableClient("QuestionnaireTopCategory");

        const questionClient = getTableClient("Questions");

        const optionClient = getTableClient("QuestionOptions");

        const [
            tops,
            middles,
            parents,
            allQuestions,
            allOptions,
            categoryEntities,
        ] = await Promise.all([
            listPartition(topClient, "TopCategory"),
            listPartition(middleClient, "MiddleCategory"),
            listPartition(parentClient, "ParentCategory"),
            listPartition(questionClient, "Question"),
            listPartition(optionClient, "QuestionOption"),
            listPartition(categoryClient, "Category"),
        ]);

        const topById = new Map(tops.map((item) => [item.rowKey, item]));
        const middleById = new Map(middles.map((item) => [item.rowKey, item]));
        const parentById = new Map(parents.map((item) => [item.rowKey, item]));
        const questionById = new Map(
            allQuestions.map((item) => [item.rowKey, item])
        );
        const optionsByQuestionId = new Map();
        for (const option of allOptions) {
            const options = optionsByQuestionId.get(option.QuestionId) || [];
            options.push(option.OptionText);
            optionsByQuestionId.set(option.QuestionId, options);
        }

        const categoryList = [];

        for (const category of categoryEntities) {
            const parent = parentById.get(category.ParentCategoryId);
            const middle = parent
                ? middleById.get(parent.MiddleCategoryId)
                : null;
            const top = middle
                ? topById.get(middle.TopCategoryId)
                : null;

            const topCategoryName = top?.TopCategoryName || "";
            const middleCategoryName = middle?.MiddleCategoryName || "";
            const parentCategoryName = parent?.ParentCategoryName || "";
            const categoryName = category.CategoryName || "";

            const fullPath = [topCategoryName, middleCategoryName, parentCategoryName, categoryName]
                .filter(Boolean)
                .join(" > ");

            const questionIds = parseQuestionIds(category.QuestionId);

            const categoryQuestions = questionIds
                .map((questionId) => {
                    const question = questionById.get(questionId);

                    if (!question) return null;

                    const options = (
                        optionsByQuestionId.get(questionId) || []
                    ).join(", ");

                    return {
                        id: question.rowKey,
                        question: question.QuestionText || "",
                        answerType: question.QuestionType || "",
                        options,
                        required: false,
                        tagId: question.TagId || ""
                    };
                })
                .filter(Boolean);

            categoryList.push({
                id: category.rowKey,
                categoryName,
                parentCategoryId: category.ParentCategoryId || "",
                parentCategoryName,
                middleCategoryId: middle?.rowKey || "",
                middleCategoryName,
                topCategoryId: top?.rowKey || "",
                topCategoryName,
                fullPath,
                tagId: category.TagId || "",
                questions: categoryQuestions
            });
        }

        categoryList.sort((a, b) => a.fullPath.localeCompare(b.fullPath));
        return categoryList;
          },
          5 * 60 * 1000
        );

        context.res = {
            status: 200,
            headers: {
                "X-List-Cache": cacheHit ? "HIT" : "MISS",
            },
            body: {
                success: true,
                categories
            }
        };
    } catch (error) {
        context.log(error);

        context.res = {
            status: 500,
            body: {
                success: false,
                error: error.message
            }
        };
    }
};
