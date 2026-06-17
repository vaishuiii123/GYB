const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {

  try {

    const { id } = req.body;

    if (!id) {

      context.res = {
        status: 400,
        body: {
          success: false,
          message:
            "Category Id is required",
        },
      };

      return;
    }

    const client =
      TableClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING,
        "QuestionnaireCategory"
      );

    await client.deleteEntity(
      "Category",
      id
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
