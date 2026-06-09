const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
  try {

    const questionId =
      req.query.questionId;

    const client =
      TableClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING,
        "QuestionnaireQuestionOptions"
      );

    const options = [];

    for await (
      const entity of client.listEntities()
    ) {

      if (
        entity.QuestionId ===
        questionId
      ) {

        options.push({
          id:
            entity.rowKey,

          optionText:
            entity.OptionText || "",
        });
      }
    }

    context.res = {
      status: 200,
      body: {
        success: true,
        options,
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
