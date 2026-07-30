const { TableClient } = require("@azure/data-tables");


module.exports = async function(context, req){

    try{


        const tableClient =
            TableClient.fromConnectionString(
                process.env.AZURE_STORAGE_CONNECTION_STRING,
                "QuestionOptions"
            );



        const {
            questionId,
            options,
            createdBy
        } = req.body;



        if(!questionId || !options || options.length === 0){

            context.res={
                status:400,
                body:{
                    success:false,
                    message:"QuestionId and options are required."
                }
            };

            return;

        }



        let maxNumber = 0;



        const existingOptions =
            tableClient.listEntities({

                queryOptions:{
                    filter:"PartitionKey eq 'QuestionOption'"
                }

            });



        for await(const option of existingOptions){


            const number =
                parseInt(
                    option.rowKey.replace("OPT","")
                );


            if(number > maxNumber){

                maxNumber = number;

            }

        }




        const createdOptions=[];



        for(const optionText of options){


            maxNumber++;



            const optionId =
                `OPT${String(maxNumber).padStart(3,"0")}`;



            const entity={


                partitionKey:"QuestionOption",

                rowKey:optionId,


                QuestionId:questionId,


                OptionText:optionText,


                CreatedBy:createdBy || "Admin",


                CreatedDate:new Date().toISOString()


            };



            await tableClient.createEntity(entity);



            createdOptions.push(entity);


        }





        context.res={

            status:201,

            body:{

                success:true,

                message:"Options saved successfully.",

                data:createdOptions

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