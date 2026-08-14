const { getTableClient } = require("../shared/tableHelper");


module.exports = async function (context, req) {

    try {


        const tableClient = getTableClient("QuestionnaireParentCategory");


        const id = req.query.id;


        if(!id){

            context.res = {
                status:400,
                body:{
                    success:false,
                    message:"Parent Category ID is required."
                }
            };

            return;
        }


        const {
            parentCategoryName,
            modifiedBy
        } = req.body;


        if(!parentCategoryName){

            context.res = {
                status:400,
                body:{
                    success:false,
                    message:"Parent Category Name is required."
                }
            };

            return;
        }


        const entity = await tableClient.getEntity(
            "ParentCategory",
            id
        );


        entity.ParentCategoryName = parentCategoryName;

        entity.ModifiedBy = modifiedBy || "Admin";

        entity.ModifiedDate = new Date().toISOString();


        await tableClient.updateEntity(
            entity,
            "Merge"
        );


        context.res = {

            status:200,

            body:{
                success:true,
                message:"Parent Category updated successfully.",
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