const { getTableClient } = require("../shared/tableHelper");



module.exports = async function (context, req) {

    try {



        const middleCategoryTable = getTableClient("QuestionnaireMiddleCategory");


        const parentCategoryTable = getTableClient("QuestionnaireParentCategory");


        const categoryTable = getTableClient("QuestionnaireCategory");



        const id = req.query.id;



        if(!id){

            context.res = {

                status:400,

                body:{
                    success:false,
                    message:"Middle Category ID is required."
                }

            };

            return;

        }




        // 1. Find Parent Categories under this Middle Category

        const parentCategories =
            parentCategoryTable.listEntities({

                queryOptions:{
                    filter:"PartitionKey eq 'ParentCategory'"
                }

            });



        for await(const parent of parentCategories){



            if(parent.MiddleCategoryId === id){



                // 2. Delete Categories under Parent Category

                const categories =
                    categoryTable.listEntities({

                        queryOptions:{
                            filter:"PartitionKey eq 'Category'"
                        }

                    });



                for await(const category of categories){



                    if(category.ParentCategoryId === parent.rowKey){


                        await categoryTable.deleteEntity(

                            "Category",

                            category.rowKey

                        );


                    }


                }




                // 3. Delete Parent Category

                await parentCategoryTable.deleteEntity(

                    "ParentCategory",

                    parent.rowKey

                );


            }


        }





        // 4. Delete Middle Category

        await middleCategoryTable.deleteEntity(

            "MiddleCategory",

            id

        );




        context.res = {

            status:200,

            body:{

                success:true,

                message:
                "Middle Category and all related Parent Categories and Categories deleted successfully."

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