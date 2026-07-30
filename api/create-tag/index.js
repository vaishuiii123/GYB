const { TableClient } = require("@azure/data-tables");


module.exports = async function(context, req){

    try{

        const connectionString =
            process.env.AZURE_STORAGE_CONNECTION_STRING;


        const tableClient =
            TableClient.fromConnectionString(
                connectionString,
                "Tags"
            );


        const {
            tagName,
            tagColor,
            createdBy
        } = req.body;



        if(!tagName || !tagColor){

            context.res = {

                status:400,

                body:{
                    success:false,
                    message:"Tag Name and Tag Color are required."
                }

            };

            return;

        }



        // duplicate check

        const tags =
            tableClient.listEntities({

                queryOptions:{
                    filter:"PartitionKey eq 'Tag'"
                }

            });



        for await(const tag of tags){


            if(
                tag.TagName.toLowerCase() ===
                tagName.toLowerCase()
            ){

                context.res={

                    status:400,

                    body:{
                        success:false,
                        message:"Tag already exists."
                    }

                };

                return;

            }

        }



        // generate TAG001 TAG002

        let count = 1;


        const existingTags =
            tableClient.listEntities({

                queryOptions:{
                    filter:"PartitionKey eq 'Tag'"
                }

            });



        for await(const tag of existingTags){

            count++;

        }



        const tagId =
            `TAG${String(count).padStart(3,"0")}`;



        const entity = {

            partitionKey:"Tag",

            rowKey:tagId,


            TagName:tagName,

            TagColor:tagColor,


            CreatedBy:createdBy || "Admin",

            CreatedDate:new Date().toISOString(),


            ModifiedBy:createdBy || "Admin",

            ModifiedDate:new Date().toISOString()

        };



        await tableClient.createEntity(entity);



        context.res={

            status:201,

            body:{

                success:true,

                message:"Tag created successfully.",

                data:entity

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