const { TableClient } = require("@azure/data-tables");

function parseQuestionIds(questionIdField) {
    if (!questionIdField) return [];
    return String(questionIdField)
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
}

module.exports = async function (context, req) {
    try {
        const { categoryId, questionId, modifiedBy } = req.body;

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

        const tableClient = TableClient.fromConnectionString(
            process.env.AZURE_STORAGE_CONNECTION_STRING,
            "QuestionnaireCategory"
        );

        const category = await tableClient.getEntity("Category", categoryId);
        const existingIds = parseQuestionIds(category.QuestionId);

        if (existingIds.includes(questionId)) {
            context.res = {
                status: 400,
                body: {
                    success: false,
                    message: "Question already assigned to this category."
                }
            };
            return;
        }

        existingIds.push(questionId);

        category.QuestionId = existingIds.join(",");
        category.ModifiedBy = modifiedBy || "Admin";
        category.ModifiedDate = new Date().toISOString();

        await tableClient.updateEntity(category, "Merge");

        context.res = {
            status: 201,
            body: {
                success: true,
                message: "Question assigned successfully.",
                data: {
                    categoryId,
                    questionId: category.QuestionId
                }
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
