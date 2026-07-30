const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
    try {
        const connectionString =
            process.env.AZURE_STORAGE_CONNECTION_STRING;

        const tableClient = TableClient.fromConnectionString(
            connectionString,
            "QuestionnaireMiddleCategory"
        );
        const id = req.query.id;
        const {
            middleCategoryName,
            modifiedBy
        } = req.body;

        if (!id || !middleCategoryName) {
            context.res = {
                status: 400,
                body: {
                    success: false,
                    message: "Middle Category Id and Name are required."
                }
            };
            return;
        }
        // Get existing middle category
        const entity = await tableClient.getEntity(
            "MiddleCategory",
            id
        );

        // Update fields
        entity.MiddleCategoryName = middleCategoryName;
        entity.ModifiedBy = modifiedBy || "Admin";
        entity.ModifiedDate = new Date().toISOString();

        await tableClient.updateEntity(
            entity,
            "Merge"
        );
        context.res = {
            status: 200,
            body: {
                success: true,
                message: "Middle Category updated successfully.",
                data: entity
            }
        };
    }
    catch(error) {
        context.log(error);
        context.res = {
            status: 500,
            body: {
                success: false,
                message: error.message
            }
        };
    }
};