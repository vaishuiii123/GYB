const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
  try {

    const {
      questionId,
      optionText,
      createdBy,
    } = req.body;

    if (
      !questionId ||
      !optionText ||
      !optionText.trim()
    ) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "Required fields missing",
        },
      };
      return;
    }

    const client =
      TableClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING,
        "QuestionnaireQuestionOptions"
      );

    await client.createEntity({
      partitionKey: "QuestionOption",

      rowKey:
        Date.now().toString(),

      QuestionId:
        questionId,

      OptionText:
        optionText,

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
        error: error.message,
      },
    };
  }
};
