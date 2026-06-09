const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
  try {

    const {
      question,
      answerType,
      color,
      createdBy,
    } = req.body;

    if (!question || !question.trim()) {

      context.res = {
        status: 400,
        body: {
          success: false,
          message: "Question is required",
        },
      };

      return;
    }

    const client =
      TableClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING,
        "QuestionnaireQuestions"
      );

    await client.createEntity({
      partitionKey: "Question",

      rowKey:
        Date.now().toString(),

      Question:
        question,

      AnswerType:
        answerType,

      Color:
        color,

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
