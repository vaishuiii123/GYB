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
        const categoryId = req.query.categoryId;

        if (!categoryId) {
            context.res = {
                status: 400,
                body: {
                    success: false,
                    message: "Category ID is required."
                }
            };
            return;
        }

        const categoryTable = TableClient.fromConnectionString(
            process.env.AZURE_STORAGE_CONNECTION_STRING,
            "QuestionnaireCategory"
        );

        const questionTable = TableClient.fromConnectionString(
            process.env.AZURE_STORAGE_CONNECTION_STRING,
            "Questions"
        );

        const optionTable = TableClient.fromConnectionString(
            process.env.AZURE_STORAGE_CONNECTION_STRING,
            "QuestionOptions"
        );

        const category = await categoryTable.getEntity("Category", categoryId);
        const questionIds = parseQuestionIds(category.QuestionId);
        const assignedQuestions = [];

        const allOptions = [];
        const optionEntities = optionTable.listEntities({
            queryOptions: {
                filter: "PartitionKey eq 'QuestionOption'"
            }
        });

        for await (const option of optionEntities) {
            allOptions.push(option);
        }

        for (const questionId of questionIds) {
            try {
                const question = await questionTable.getEntity(
                    "Question",
                    questionId
                );

                const options = allOptions
                    .filter((opt) => opt.QuestionId === questionId)
                    .map((opt) => ({
                        id: opt.rowKey,
                        optionText: opt.OptionText
                    }));

                assignedQuestions.push({
                    questionId,
                    questionText: question.QuestionText,
                    questionType: question.QuestionType,
                    tagId: question.TagId || "",
                    options
                });
            } catch {
                // question was deleted, skip
            }
        }

        context.res = {
            status: 200,
            body: {
                success: true,
                data: assignedQuestions
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
