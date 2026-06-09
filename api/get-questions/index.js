const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
  try {

    const client =
      TableClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING,
        "QuestionnaireQuestions"
      );

    const questions = [];

    for await (
      const entity of client.listEntities()
    ) {

      questions.push({
        id:
          entity.rowKey,

        question:
          entity.Question || "",

        answerType:
          entity.AnswerType || "",

        color:
          entity.Color || "#2563eb",
      });
    }

    context.res = {
      status: 200,
      body: {
        success: true,
        questions,
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
