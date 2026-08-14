const { getTableClient } = require("../shared/tableHelper");


module.exports = async function (context, req) {

    try {


        const tableClient = getTableClient("QuestionnaireTopCategory");


        const id = req.query.id;

        const {
            topCategoryName,
            modifiedBy
        } = req.body;


        if (!id || !topCategoryName) {

            context.res = {
                status: 400,
                body: {
                    success: false,
                    message: "Category Id and Top Category Name are required."
                }
            };

            return;
        }


        const entity = await tableClient.getEntity(
            "TopCategory",
            id
        );


        entity.TopCategoryName = topCategoryName;

        entity.ModifiedBy = modifiedBy || "Admin";

        entity.ModifiedDate = new Date().toISOString();



        await tableClient.updateEntity(
            entity,
            "Replace"
        );


        context.res = {

            status: 200,

            body: {
                success: true,
                message: "Top Category updated successfully.",
                data: entity
            }

        };


    }
    catch(error) {

        context.log(error);


        context.res = {

            status: 500,

            body: {
                success: false,
                message: error.message
            }

        };

    }

};