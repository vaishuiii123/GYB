const { getTableClient } = require("../shared/tableHelper");


module.exports = async function(context, req){

    try{



        const tableClient =
            getTableClient("QuestionnaireCategory");


        const id = req.query.id;


        if(!id){

            context.res = {

                status:400,

                body:{
                    success:false,
                    message:"Category ID is required."
                }

            };

            return;
        }



        await tableClient.deleteEntity(
            "Category",
            id
        );



        context.res = {

            status:200,

            body:{
                success:true,
                message:"Category deleted successfully."
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