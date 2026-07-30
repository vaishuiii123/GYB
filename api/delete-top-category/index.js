const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {

    try {

        const connectionString =
            process.env.AZURE_STORAGE_CONNECTION_STRING;


        const topCategoryTable = TableClient.fromConnectionString(
            connectionString,
            "QuestionnaireTopCategory"
        );


        const middleCategoryTable = TableClient.fromConnectionString(
            connectionString,
            "QuestionnaireMiddleCategory"
        );


        const parentCategoryTable = TableClient.fromConnectionString(
            connectionString,
            "QuestionnaireParentCategory"
        );


        const categoryTable = TableClient.fromConnectionString(
            connectionString,
            "QuestionnaireCategory"
        );



        const id = req.query.id;



        if(!id){

            context.res = {

                status:400,

                body:{
                    success:false,
                    message:"Top Category ID is required."
                }

            };

            return;

        }



        // 1. Find Middle Categories under Top Category

        const middleCategories =
            middleCategoryTable.listEntities({

                queryOptions:{
                    filter:"PartitionKey eq 'MiddleCategory'"
                }

            });



        for await(const middle of middleCategories){


            if(middle.TopCategoryId === id){



                // 2. Find Parent Categories under Middle Category

                const parentCategories =
                    parentCategoryTable.listEntities({

                        queryOptions:{
                            filter:"PartitionKey eq 'ParentCategory'"
                        }

                    });



                for await(const parent of parentCategories){



                    if(parent.MiddleCategoryId === middle.rowKey){



                        // 3. Delete Categories under Parent Category

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
                        // 4. Delete Parent Category
                        await parentCategoryTable.deleteEntity(
                            "ParentCategory",
                            parent.rowKey
                        );
                    }
                }
                // 5. Delete Middle Category
                await middleCategoryTable.deleteEntity(
                    "MiddleCategory",
                    middle.rowKey
                );
            }
        }

        // 6. Delete Top Category
        await topCategoryTable.deleteEntity(
            "TopCategory",
            id
        );

        context.res = {
            status:200,
            body:{
                success:true,
                message:
                "Top Category and all related Middle, Parent and Category records deleted successfully."
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