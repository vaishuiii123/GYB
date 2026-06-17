const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {

  try {

    const {
      id,
      categoryName,
    } = req.body;

    if (!id || !categoryName) {

      context.res = {
        status: 400,
        body: {
          success: false,
          message:
            "Required fields missing",
        },
      };

      return;
    }

    const client =
      TableClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING,
        "QuestionnaireCategory"
      );

    const entity =
      await client.getEntity(
        "Category",
        id
      );

    entity.CategoryName =
      categoryName;

    await client.updateEntity(
      entity,
      "Replace"
    );

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
