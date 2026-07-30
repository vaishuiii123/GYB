const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {

    try {

        const connectionString =
            process.env.AZURE_STORAGE_CONNECTION_STRING;


        const tableClient = TableClient.fromConnectionString(
            connectionString,
            "QuestionnaireCategory"
        );


        const parentCategoryId = req.query.parentCategoryId;


        if(!parentCategoryId){

            context.res = {
                status:400,
                body:{
                    success:false,
                    message:"Parent Category Id is required."
                }
            };

            return;
        }


        const categories = [];


        const entities = tableClient.listEntities({
            queryOptions:{
                filter:"PartitionKey eq 'Category'"
            }
        });


        for await(const entity of entities){

            if(entity.ParentCategoryId === parentCategoryId){

                categories.push({

                    id:entity.rowKey,

                    categoryName:
                    entity.CategoryName,

                    parentCategoryId:
                    entity.ParentCategoryId,

                    questionId:
                    entity.QuestionId,

                    tagId:
                    entity.TagId || "",

                    createdBy:
                    entity.CreatedBy,

                    createdDate:
                    entity.CreatedDate,

                    modifiedBy:
                    entity.ModifiedBy,

                    modifiedDate:
                    entity.ModifiedDate

                });

            }

        }


        context.res = {

            status:200,

            body:{
                success:true,
                data:categories
            }

        };


    }
    catch(error){

        context.log(error);

        context.res={

            status:500,

            body:{
                success:false,
                message:error.message
            }

        };

    }

};