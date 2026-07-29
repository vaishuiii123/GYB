const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {

    try {
        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        const tableClient = TableClient.fromConnectionString(
            connectionString,
            "QuestionnaireTopCategory"
        );
        const { topCategoryName, createdBy } = req.body;
        if (!topCategoryName) {
            context.res = {
                status: 400,
                body: {
                    success: false,
                    message: "Top Category Name is required."
                }
            };
            return;
        }

        const entity = {
            partitionKey: "TopCategory",
            rowKey: `TOP${Date.now()}`,
            TopCategoryName: topCategoryName,
            CreatedBy: createdBy || "Admin",
            CreatedDate: new Date().toISOString(),
            ModifiedBy: createdBy || "Admin",
            ModifiedDate: new Date().toISOString()
        };

        await tableClient.createEntity(entity);
        context.res = {
            status: 201,
            body: {
                success: true,
                message: "Top Category created successfully.",
                data: entity
            }
        };

    }
    catch (error) {

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
