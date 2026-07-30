const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {

    try {

        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

        const tableClient = TableClient.fromConnectionString(
            connectionString,
            "QuestionnaireParentCategory"
        );

        const {
            middleCategoryId,
            parentCategoryName,
            createdBy
        } = req.body;


        if (!middleCategoryId || !parentCategoryName) {

            context.res = {
                status:400,
                body:{
                    success:false,
                    message:"Middle Category Id and Parent Category Name are required."
                }
            };

            return;
        }


        // Check duplicate parent category under same middle category

        const existingParents = tableClient.listEntities({
            queryOptions:{
                filter:"PartitionKey eq 'ParentCategory'"
            }
        });


        for await (const entity of existingParents) {

            if(
                entity.MiddleCategoryId === middleCategoryId &&
                entity.ParentCategoryName?.toLowerCase() ===
                parentCategoryName.toLowerCase()
            ){

                context.res = {
                    status:400,
                    body:{
                        success:false,
                        message:"Parent Category already exists."
                    }
                };

                return;
            }
        }


        // Generate PAR001, PAR002...

        let maxId = 0;

        const parentEntities = tableClient.listEntities({
            queryOptions:{
                filter:"PartitionKey eq 'ParentCategory'"
            }
        });


        for await (const entity of parentEntities){

            const currentId = parseInt(
                entity.rowKey.replace("PAR","")
            );

            if(currentId > maxId){
                maxId = currentId;
            }
        }


        const parentCategoryId =
            `PAR${String(maxId + 1).padStart(3,"0")}`;


        const entity = {

            partitionKey:"ParentCategory",

            rowKey:parentCategoryId,

            ParentCategoryName:parentCategoryName,

            MiddleCategoryId:middleCategoryId,

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
                message:"Parent Category created successfully.",
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