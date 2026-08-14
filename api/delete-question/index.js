const { getTableClient } = require("../shared/tableHelper");


module.exports = async function (context, req) {
    try {
        const questionId = req.query.id;

        if (!questionId) {
            context.res = {
                status: 400,
                body: {
                    success: false,
                    message: "Question ID is required."
                }
            };
            return;
        }

        const questionTable = getTableClient("Questions");

        const optionTable = getTableClient("QuestionOptions");

        await questionTable.deleteEntity("Question", questionId);

        const options = optionTable.listEntities({
            queryOptions: {
                filter: `QuestionId eq '${questionId}'`
            }
        });

        for await (const option of options) {
            await optionTable.deleteEntity("QuestionOption", option.rowKey);
        }

        context.res = {
            status: 200,
            body: {
                success: true,
                message: "Question deleted successfully."
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
