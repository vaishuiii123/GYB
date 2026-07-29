const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
    try {
        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        const tableClient = TableClient.fromConnectionString(
            connectionString,
            "QuestionnaireTopCategory"
        );
        const { topCategoryName, createdBy } = req.body;
        
        // Check duplicate Top Category Name
        const existingCategories = tableClient.listEntities({
            queryOptions: {
                filter: `PartitionKey eq 'TopCategory'`
            }
        });

        for await (const category of existingCategories) {
            if (
                category.TopCategoryName.toLowerCase() 
                === topCategoryName.toLowerCase()
            ) {
                context.res = {
                    status: 409,
                    body: {
                        success: false,
                        message: "Top Category already exists."
                    }
                };
                return;
            }
        }

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
        // Generate sequential ID
        let count = 1;
        const entities = tableClient.listEntities();
        for await (const item of entities) {
            count++;
        }
        const topCategoryId = `TOP${String(count).padStart(3, "0")}`;
        // Create entity
        const entity = {
            partitionKey: "TopCategory",
            rowKey: topCategoryId,
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