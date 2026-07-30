const { TableClient } = require("@azure/data-tables");

module.exports = async function(context, req){

    try{

        const connectionString =
            process.env.AZURE_STORAGE_CONNECTION_STRING;


        const tableClient =
            TableClient.fromConnectionString(
                connectionString,
                "QuestionnaireCategory"
            );


        const id = req.query.id;


        const {
            categoryName,
            tagId,
            modifiedBy
        } = req.body;



        if(!id || !categoryName){

            context.res = {
                status:400,
                body:{
                    success:false,
                    message:"Category ID and Category Name are required."
                }
            };

            return;
        }



        const entity =
            await tableClient.getEntity(
                "Category",
                id
            );



        entity.CategoryName = categoryName;

        if (tagId !== undefined) {
            entity.TagId = tagId;
        }

        entity.ModifiedBy =
            modifiedBy || "Admin";

        entity.ModifiedDate =
            new Date().toISOString();



        await tableClient.updateEntity(
            entity,
            "Merge"
        );



        context.res = {

            status:200,

            body:{
                success:true,
                message:"Category updated successfully.",
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