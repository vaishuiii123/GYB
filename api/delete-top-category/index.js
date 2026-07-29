const { TableClient } = require("@azure/data-tables");


module.exports = async function (context, req) {

    try {
        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        const tableClient = TableClient.fromConnectionString(
            connectionString,
            "QuestionnaireTopCategory"
        );

        const id = req.query.id;

        if (!id) {
            context.res = {
                status: 400,
                body: {
                    success:false,
                    message:"Top Category ID is required."
                }
            };
            return;
        }
        await tableClient.deleteEntity(
            "TopCategory",
            id
        );

        context.res = {
            status:200,
            body:{
                success:true,
                message:"Top Category deleted successfully."
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