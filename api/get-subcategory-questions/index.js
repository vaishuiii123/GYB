const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
  try {

    const subCategoryId =
      req.query.subCategoryId;

    const client =
      TableClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING,
        "QuestionnaireSubCategoryQuestions"
      );

    const questionIds = [];

    for await (
      const entity of client.listEntities()
    ) {

      if (
        entity.SubCategoryId ===
        subCategoryId
      ) {

        questionIds.push(
          entity.QuestionId
        );
      }
    }

    context.res = {
      status: 200,
      body: {
        success: true,
        questionIds,
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
