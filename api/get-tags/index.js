const { getTableClient } = require("../shared/tableHelper");
const { CACHE_KEYS, getOrLoad } = require("../shared/listCache");

async function loadTags() {
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




        return tags;
}

module.exports = async function (context, req) {

    try {
        const { value: tags, cacheHit } = await getOrLoad(
            CACHE_KEYS.tags,
            loadTags,
            5 * 60 * 1000
        );

        context.res = {

            status:200,
            headers: { "X-List-Cache": cacheHit ? "HIT" : "MISS" },

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