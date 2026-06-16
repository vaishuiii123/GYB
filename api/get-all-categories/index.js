const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {

  try {

    const client =
      TableClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING,
        "QuestionnaireCategory"
      );

    const categories = [];

    for await (
      const entity of client.listEntities()
    ) {

      // Ignore old test records
      if (
        entity.partitionKey === "Category"
      ) {

        categories.push({
          id: entity.rowKey,

          categoryName:
            entity.CategoryName || "",

          masterCategoryId:
            entity.MasterCategoryId || "",

          createdBy:
            entity.Created_By || "",
        });
      }
    }

    context.res = {
      status: 200,
      body: {
        success: true,
        categories,
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
