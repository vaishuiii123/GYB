const { getTableClient } = require("../shared/tableHelper");



module.exports = async function (context, req) {

    try {





        const tableClient =
            getTableClient("Questions");



        const {

            questionText,
            questionType,
            tagId,
            createdBy

        } = req.body;




        if(
            !questionText ||
            !questionType
        ){

            context.res = {

                status:400,

                body:{
                    success:false,
                    message:"Question text and question type are required."
                }

            };

            return;

        }





        // Generate Question ID Q001, Q002...

        let maxNumber = 0;



        const existingQuestions =
            tableClient.listEntities({

                queryOptions:{
                    filter:"PartitionKey eq 'Question'"
                }

            });



        for await(const entity of existingQuestions){


            const number =
                parseInt(
                    entity.rowKey.replace("Q","")
                );


            if(
                !isNaN(number) &&
                number > maxNumber
            ){

                maxNumber = number;

            }

        }




        const questionId =
            `Q${String(maxNumber + 1).padStart(3,"0")}`;





        const entity = {


            partitionKey:"Question",

            rowKey:questionId,


            QuestionText:questionText,


            QuestionType:questionType,


            TagId:tagId || "",


            CreatedBy:createdBy || "Admin",


            CreatedDate:new Date().toISOString(),


            ModifiedBy:createdBy || "Admin",


            ModifiedDate:new Date().toISOString()


        };





        await tableClient.createEntity(entity);




        context.res = {


            status:201,


            body:{


                success:true,


                message:"Question created successfully.",


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