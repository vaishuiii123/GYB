const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
  try {

    const {
      categoryId,
      subCategoryName,
      createdBy,
    } = req.body;

    if (
      !subCategoryName ||
      !subCategoryName.trim()
    ) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message:
            "Sub Category Name is required",
        },
      };
      return;
    }

    const client =
      TableClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING,
        "Questionnairesubcategory"
      );

    await client.createEntity({
      partitionKey: "SubCategory",

      rowKey:
        Date.now().toString(),

      CategoryId:
        categoryId,

      SubCategoryName:
        subCategoryName,

      Created_By:
        createdBy || "",
    });

    context.res = {
      status: 200,
      body: {
        success: true,
      },
    };

  } catch (error) {

    context.log(error);

    context.res = {
      status: 500,
      body: {
        success: false,
        error:
          error.message,
      },
    };
  }
};
