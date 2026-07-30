const { TableClient } = require("@azure/data-tables");


module.exports = async function (context, req) {

    try {

        const connectionString =
            process.env.AZURE_STORAGE_CONNECTION_STRING;


        const tableClient =
            TableClient.fromConnectionString(
                connectionString,
                "Tags"
            );


        const id = req.query.id;


        const {
            tagName,
            tagColor,
            modifiedBy
        } = req.body;



        if(!id){

            context.res = {

                status:400,

                body:{
                    success:false,
                    message:"Tag ID is required."
                }

            };

            return;

        }



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




        const existingTag =
            await tableClient.getEntity(
                "Tag",
                id
            );



        existingTag.TagName = tagName;

        existingTag.TagColor = tagColor;

        existingTag.ModifiedBy =
            modifiedBy || "Admin";

        existingTag.ModifiedDate =
            new Date().toISOString();




        await tableClient.updateEntity(
            existingTag,
            "Replace"
        );



        context.res = {

            status:200,

            body:{

                success:true,

                message:"Tag updated successfully.",

                data:existingTag

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