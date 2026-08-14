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
        const categoryId = req.query.categoryId;
        const questionId = req.query.questionId;

        if (!categoryId || !questionId) {
            context.res = {
                status: 400,
                body: {
                    success: false,
                    message: "Category ID and Question ID are required."
                }
            };
            return;
        }

        const tableClient = getTableClient("QuestionnaireCategory");

        const category = await tableClient.getEntity("Category", categoryId);
        const existingIds = parseQuestionIds(category.QuestionId);
        const updatedIds = existingIds.filter((id) => id !== questionId);

        category.QuestionId = updatedIds.join(",");
        category.ModifiedBy = "Admin";
        category.ModifiedDate = new Date().toISOString();

        await tableClient.updateEntity(category, "Merge");

        context.res = {
            status: 200,
            body: {
                success: true,
                message: "Question removed from category."
            }
        };
    } catch (error) {
        context.res = {
            status: 500,
            body: {
                success: false,
                message: error.message
            }
        };
    }
};
