const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
    try {
        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

        const tableClient = TableClient.fromConnectionString(
            connectionString,
            "QuestionnaireCategory"
        );

        const {
            parentCategoryId,
            categoryName,
            tagId,
            createdBy
        } = req.body;

        if(!parentCategoryId || !categoryName){
            context.res = {
                status:400,
                body:{
                    success:false,
                    message:"Parent Category Id and Category Name are required."
                }
            };
            return;
        }
        // Check duplicate category under same parent category
        const existingCategories = tableClient.listEntities({
            queryOptions:{
                filter:"PartitionKey eq 'Category'"
            }
        });

        for await (const entity of existingCategories){
            if(
                entity.ParentCategoryId === parentCategoryId &&
                entity.CategoryName.toLowerCase() ===
                categoryName.toLowerCase()
            ){
                context.res = {
                    status:400,
                    body:{
                        success:false,
                        message:"Category already exists."
                    }
                };
                return;
            }
        }
        // Generate CAT001, CAT002...
        let count = 1;
        const categories = tableClient.listEntities({
            queryOptions:{
                filter:"PartitionKey eq 'Category'"
            }
        });

        for await (const entity of categories){
            count++;
        }

        const categoryId =
            `CAT${String(count).padStart(3,"0")}`;

        const entity = {
            partitionKey:"Category",
            rowKey:categoryId,
            CategoryName:categoryName,
            ParentCategoryId:parentCategoryId,
            TagId:tagId || "",
            CreatedBy:createdBy || "Admin",
            CreatedDate:new Date().toISOString(),
            ModifiedBy:createdBy || "Admin",
            ModifiedDate:new Date().toISOString()
        };
        await tableClient.createEntity(entity);
        context.res = {
            status:201,
            body:{
                success:true,
                message:"Category created successfully.",
                data:entity
            }
        };
    }
    catch(error){
        context.log(error);
        context.res = {
            status:500,
            body:{
                success:false,
                message:error.message
            }
        };
    }
};