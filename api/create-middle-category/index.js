const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {

    try {

        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

        const tableClient = TableClient.fromConnectionString(
            connectionString,
            "QuestionnaireMiddleCategory"
        );


        const {
            topCategoryId,
            middleCategoryName,
            createdBy
        } = req.body;


        if (!topCategoryId || !middleCategoryName) {

            context.res = {
                status: 400,
                body: {
                    success: false,
                    message: "Top Category Id and Middle Category Name are required."
                }
            };

            return;
        }


        // Check duplicate middle category under same top category

        const existingCategories = tableClient.listEntities({
            queryOptions: {
                filter: "PartitionKey eq 'MiddleCategory'"
            }
        });


        for await (const entity of existingCategories) {

            if (
                entity.TopCategoryId === topCategoryId &&
                entity.MiddleCategoryName.toLowerCase() ===
                middleCategoryName.toLowerCase()
            ) {
                context.res = {
                    status: 400,
                    body: {
                        success: false,
                        message: "Middle Category already exists."
                    }
                };
                return;
            }
        }

        // Generate MID001, MID002, MID003...

       let maxId = 0;

const middleEntities = tableClient.listEntities({
    queryOptions: {
        filter: "PartitionKey eq 'MiddleCategory'"
    }
});

for await (const entity of middleEntities) {

    const currentId = parseInt(
        entity.rowKey.replace("MID", "")
    );

    if (currentId > maxId) {
        maxId = currentId;
    }
}

const middleCategoryId =
    `MID${String(maxId + 1).padStart(3, "0")}`;
    
        const entity = {
            partitionKey: "MiddleCategory",
            rowKey: middleCategoryId,
            MiddleCategoryName: middleCategoryName,
            TopCategoryId: topCategoryId,
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
                message: "Middle Category created successfully.",
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