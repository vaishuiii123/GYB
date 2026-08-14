const { getTableClient } = require("../shared/tableHelper");



module.exports = async function(context, req) {

    try {



        const tableClient =
            getTableClient("Tags");


        const {
            tagName,
            tagColor,
            createdBy
        } = req.body;


        if (!tagName || !tagColor) {

            context.res = {
                status: 400,
                body: {
                    success: false,
                    message: "Tag Name and Tag Color are required."
                }
            };

            return;
        }



        // Check duplicate tag name

        const tags = tableClient.listEntities({

            queryOptions: {
                filter: "PartitionKey eq 'Tag'"
            }

        });


        for await (const tag of tags) {

            if (
                tag.TagName.toLowerCase() ===
                tagName.toLowerCase()
            ) {

                context.res = {

                    status: 400,

                    body: {
                        success: false,
                        message: "Tag already exists."
                    }

                };

                return;
            }
        }



        // Generate next TAG001, TAG002, TAG003...

        let maxNumber = 0;


        const existingTags = tableClient.listEntities({

            queryOptions: {
                filter: "PartitionKey eq 'Tag'"
            }

        });


        for await (const entity of existingTags) {

            const existingId = entity.rowKey; 
            // Example: TAG001

            const number = parseInt(
                existingId.replace("TAG", "")
            );


            if (!isNaN(number) && number > maxNumber) {

                maxNumber = number;

            }

        }


        const tagId =
            `TAG${String(maxNumber + 1).padStart(3, "0")}`;



        const entity = {

            partitionKey: "Tag",

            rowKey: tagId,

            TagName: tagName,

            TagColor: tagColor,

            CreatedBy: createdBy || "Admin",

            CreatedDate: new Date().toISOString(),

            ModifiedBy: createdBy || "Admin",

            ModifiedDate: new Date().toISOString()

        };



        await tableClient.createEntity(entity);



        context.res = {

            status: 201,

            body: {

                success: true,

                message: "Tag created successfully.",

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