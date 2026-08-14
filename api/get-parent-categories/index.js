const { getTableClient } = require("../shared/tableHelper");


module.exports = async function (context, req) {

    try {


        const tableClient = getTableClient("QuestionnaireParentCategory");


        const middleCategoryId = req.query.middleCategoryId;


        if(!middleCategoryId){

            context.res = {
                status:400,
                body:{
                    success:false,
                    message:"Middle Category Id is required."
                }
            };

            return;
        }


        const parentCategories = [];


        const entities = tableClient.listEntities({
            queryOptions:{
                filter:"PartitionKey eq 'ParentCategory'"
            }
        });


        for await (const entity of entities){

            if(entity.MiddleCategoryId === middleCategoryId){

                parentCategories.push({

                    id: entity.rowKey,

                    parentCategoryName:
                    entity.ParentCategoryName,

                    MiddleCategoryId:
                    entity.MiddleCategoryId,

                    CreatedBy:
                    entity.CreatedBy,

                    CreatedDate:
                    entity.CreatedDate,

                    ModifiedBy:
                    entity.ModifiedBy,

                    ModifiedDate:
                    entity.ModifiedDate

                });

            }

        }


        context.res = {

            status:200,

            body:{
                success:true,
                data:parentCategories
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