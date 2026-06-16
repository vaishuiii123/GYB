const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {

  try {

    const {
      question,
      answerType,
      color,
      required,
      weightage,
      options,
      categoryId,
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

    const questionId =
      Date.now().toString();

    await client.createEntity({

      partitionKey:
        "Question",

      rowKey:
        questionId,

      Question:
        question,

      AnswerType:
        answerType,

      Required:
        required,

      Weightage:
        weightage,

      Color:
        color,

      Options:
        options || "",

      CategoryId:
        categoryId || "",

      Created_By:
        createdBy || "",
    });

    context.res = {
      status: 200,
      body: {
        success: true,
        questionId,
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
