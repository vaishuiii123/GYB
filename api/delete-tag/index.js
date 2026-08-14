const { getTableClient } = require("../shared/tableHelper");



module.exports = async function (context, req) {

    try {



        const tableClient =
            getTableClient("Tags");


        const id = req.query.id;



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



        await tableClient.deleteEntity(

            "Tag",

            id

        );



        context.res = {

            status:200,

            body:{

                success:true,

                message:"Tag deleted successfully."

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