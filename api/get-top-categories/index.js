const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {

    try {
        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        const tableClient = TableClient.fromConnectionString(
            connectionString,
            "QuestionnaireTopCategory"
        );
        const entities = [];

        // Get only TopCategory records
        const queryOptions = {
            queryOptions: {
                filter: "PartitionKey eq 'TopCategory'"
            }
        };
        for await (const entity of tableClient.listEntities(queryOptions)) {
            entities.push({
                id: entity.rowKey,
                topCategoryName: entity.TopCategoryName,
                createdBy: entity.CreatedBy || "Admin",
                createdDate: entity.CreatedDate,
                modifiedBy: entity.ModifiedBy || "Admin",
                modifiedDate: entity.ModifiedDate
            });
        }
        // Sort TOP001, TOP002, TOP003
        entities.sort((a, b) =>
            a.id.localeCompare(b.id)
        );
        context.res = {
            status: 200,
            body: {
                success: true,
                count: entities.length,
                data: entities
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