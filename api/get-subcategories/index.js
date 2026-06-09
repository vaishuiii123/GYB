const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
  try {

    const categoryId =
      req.query.categoryId;

    const client =
      TableClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING,
        "QuestionnaireSubCategory"
      );

    const subCategories = [];

    for await (
      const entity of client.listEntities()
    ) {

      if (
        entity.CategoryId ===
        categoryId
      ) {

        subCategories.push({
          id:
            entity.rowKey,

          subCategoryName:
            entity.SubCategoryName ||
            "",
        });
      }
    }

    context.res = {
      status: 200,
      body: {
        success: true,
        subCategories,
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
