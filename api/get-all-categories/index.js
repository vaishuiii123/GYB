const { getTableClient } = require("../shared/tableHelper");


function parseQuestionIds(questionIdField) {
    if (!questionIdField) return [];
    return String(questionIdField)
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
}

module.exports = async function (context, req) {
    try {
        const categoryClient = getTableClient("QuestionnaireCategory");

        const parentClient = getTableClient("QuestionnaireParentCategory");

        const middleClient = getTableClient("QuestionnaireMiddleCategory");

        const topClient = getTableClient("QuestionnaireTopCategory");

        const questionClient = getTableClient("Questions");

        const optionClient = getTableClient("QuestionOptions");

        const tops = [];
        const middles = [];
        const parents = [];

        for await (const item of topClient.listEntities({
            queryOptions: { filter: "PartitionKey eq 'TopCategory'" }
        })) {
            tops.push(item);
        }

        for await (const item of middleClient.listEntities({
            queryOptions: { filter: "PartitionKey eq 'MiddleCategory'" }
        })) {
            middles.push(item);
        }

        for await (const item of parentClient.listEntities({
            queryOptions: { filter: "PartitionKey eq 'ParentCategory'" }
        })) {
            parents.push(item);
        }

        const allQuestions = [];
        for await (const item of questionClient.listEntities({
            queryOptions: { filter: "PartitionKey eq 'Question'" }
        })) {
            allQuestions.push(item);
        }

        const allOptions = [];
        for await (const item of optionClient.listEntities({
            queryOptions: { filter: "PartitionKey eq 'QuestionOption'" }
        })) {
            allOptions.push(item);
        }

        const categories = [];

        for await (const category of categoryClient.listEntities({
            queryOptions: { filter: "PartitionKey eq 'Category'" }
        })) {
            const parent = parents.find(
                (p) => p.rowKey === category.ParentCategoryId
            );
            const middle = parent
                ? middles.find((m) => m.rowKey === parent.MiddleCategoryId)
                : null;
            const top = middle
                ? tops.find((t) => t.rowKey === middle.TopCategoryId)
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
                    const question = allQuestions.find(
                        (q) => q.rowKey === questionId
                    );

                    if (!question) return null;

                    const options = allOptions
                        .filter((opt) => opt.QuestionId === questionId)
                        .map((opt) => opt.OptionText)
                        .join(", ");

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

            categories.push({
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

        categories.sort((a, b) => a.fullPath.localeCompare(b.fullPath));

        context.res = {
            status: 200,
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
