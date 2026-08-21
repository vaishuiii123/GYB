const { getTableClient } = require("../shared/tableHelper");



module.exports = async function (context, req) {

    try {





        const tableClient =
            getTableClient("Questions");



        const questions = [];



        const entities =
            tableClient.listEntities({

                queryOptions: {
                    filter: "PartitionKey eq 'Question'",
                    select: [
                        "RowKey",
                        "QuestionText",
                        "QuestionType",
                        "TagId",
                        "AttachmentsApplicable",
                        "CreatedBy",
                        "CreatedDate",
                        "ModifiedBy",
                        "ModifiedDate",
                    ],
                }

            });



        for await (const entity of entities) {


            questions.push({

                id: entity.rowKey,

                questionText: entity.QuestionText,

                questionType: entity.QuestionType,

                tagId: entity.TagId,

                attachmentsApplicable:
                    String(entity.AttachmentsApplicable || "N").toUpperCase() ===
                    "Y"
                        ? "Y"
                        : "N",

                createdBy: entity.CreatedBy,

                createdDate: entity.CreatedDate,

                modifiedBy: entity.ModifiedBy,

                modifiedDate: entity.ModifiedDate

            });


        }




        context.res = {

            status:200,

            body:{

                success:true,

                data:questions

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