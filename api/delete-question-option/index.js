const { getTableClient } = require("../shared/tableHelper");


module.exports = async function (context, req) {
    try {
        const optionId = req.query.id;

        if (!optionId) {
            context.res = {
                status: 400,
                body: {
                    success: false,
                    message: "Option ID is required."
                }
            };
            return;
        }

        const optionTable = getTableClient("QuestionOptions");

        await optionTable.deleteEntity("QuestionOption", optionId);

        context.res = {
            status: 200,
            body: {
                success: true,
                message: "Option deleted successfully."
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
