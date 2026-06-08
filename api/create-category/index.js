const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
  try {
    const {
      masterCategoryId,
      categoryName,
      createdBy,
    } = req.body;

    if (!categoryName || !categoryName.trim()) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "Category Name is required",
        },
      };
      return;
    }

    const client =
      TableClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING,
        "QuestionnaireCategory"
      );

    await client.createEntity({
      partitionKey: "Category",
      rowKey: Date.now().toString(),

      MasterCategoryId: masterCategoryId,
      CategoryName: categoryName,
      Created_By: createdBy || "",
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
        error: error.message,
      },
    };
  }
};
