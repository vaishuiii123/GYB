const { getTableClient } = require("../shared/tableHelper");
const { CACHE_KEYS, getOrLoad } = require("../shared/listCache");

async function loadTopCategories() {
        const tableClient = getTableClient("QuestionnaireTopCategory");
        const entities = [];

        // Get only TopCategory records
        const queryOptions = {
            queryOptions: {
                filter: "PartitionKey eq 'TopCategory'",
                select: [
                    "RowKey",
                    "TopCategoryName",
                    "CreatedBy",
                    "CreatedDate",
                    "ModifiedBy",
                    "ModifiedDate",
                ],
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
        return entities;
}

module.exports = async function (context, req) {

    try {
        const { value: entities, cacheHit } = await getOrLoad(
            CACHE_KEYS.topCategories,
            loadTopCategories,
            5 * 60 * 1000
        );

        context.res = {
            status: 200,
            headers: { "X-List-Cache": cacheHit ? "HIT" : "MISS" },
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