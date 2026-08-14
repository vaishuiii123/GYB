const { getTableClient } = require("../shared/tableHelper");


module.exports = async function (context, req) {
    try {

        const tableClient = getTableClient("QuestionnaireMiddleCategory");

        const topCategoryId = req.query.topCategoryId;

        if (!topCategoryId) {
            context.res = {
                status: 400,
                body: {
                    success: false,
                    message: "Top Category Id is required."
                }
            };
            return;
        }

        const middleCategories = [];

        const entities = tableClient.listEntities({
            queryOptions: {
                filter: "PartitionKey eq 'MiddleCategory'"
            }
        });

      
        for await (const entity of entities) {
            if (entity.TopCategoryId === topCategoryId) {
                middleCategories.push({
                    id: entity.rowKey,
                    middleCategoryName: entity.MiddleCategoryName,
                    createdBy: entity.CreatedBy,
                    createdDate: entity.CreatedDate,
                    modifiedBy: entity.ModifiedBy,
                    modifiedDate: entity.ModifiedDate
                });
            }
        }

        middleCategories.sort((a, b) =>
            a.id.localeCompare(b.id)
        );
        context.res = {
            status: 200,
            body: {
                success: true,
                count: middleCategories.length,
                data: middleCategories
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