const { getTableClient } = require("../shared/tableHelper");



module.exports = async function (context, req) {

    try {



        const tableClient =
            getTableClient("Tags");



        const tags = [];



        const entities =
            tableClient.listEntities({

                queryOptions:{
                    filter:"PartitionKey eq 'Tag'",
                    select: [
                        "RowKey",
                        "TagName",
                        "TagColor",
                        "CreatedBy",
                        "CreatedDate",
                        "ModifiedBy",
                        "ModifiedDate",
                    ],
                }

            });



        for await (const entity of entities) {


            tags.push({

                id: entity.rowKey,

                tagName: entity.TagName,

                tagColor: entity.TagColor,

                createdBy: entity.CreatedBy,

                createdDate: entity.CreatedDate,

                modifiedBy: entity.ModifiedBy,

                modifiedDate: entity.ModifiedDate

            });


        }




        context.res = {

            status:200,

            body:{

                success:true,

                data:tags

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