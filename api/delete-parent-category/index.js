const { getTableClient } = require("../shared/tableHelper");



module.exports = async function (context, req) {

    try {




        const parentCategoryTable = getTableClient("QuestionnaireParentCategory");


        const categoryTable = getTableClient("QuestionnaireCategory");



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



        // 1. Delete all Categories under this Parent Category

        const categories =
            categoryTable.listEntities({

                queryOptions:{
                    filter:"PartitionKey eq 'Category'"
                }

            });



        for await(const category of categories){



            if(category.ParentCategoryId === id){


                await categoryTable.deleteEntity(

                    "Category",

                    category.rowKey

                );


            }


        }




        // 2. Delete Parent Category

        await parentCategoryTable.deleteEntity(

            "ParentCategory",

            id

        );





        context.res = {

            status:200,

            body:{

                success:true,

                message:
                "Parent Category and related Categories deleted successfully."

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