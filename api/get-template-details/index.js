const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {

  try {

    const templateId =
      req.query.templateId;

    if (!templateId) {

      context.res = {
        status: 400,
        body: {
          success: false,
          message: "templateId required"
        }
      };

      return;
    }

    const templateClient =
      TableClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING,
        "Template"
      );

    const questionClient =
      TableClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING,
        "QuestionnaireQuestions"
      );

    let template = null;

    for await (
      const entity of templateClient.listEntities()
    ) {

      if (
        entity.rowKey === templateId
      ) {

        template = entity;
        break;
      }
    }

    if (!template) {

      context.res = {
        status: 404,
        body: {
          success: false,
          message: "Template not found"
        }
      };

      return;
    }

    const questionIds =
      template.QuestionIds
        .split(",");

    const questions = [];

    for await (
      const question of questionClient.listEntities()
    ) {

      if (
        questionIds.includes(
          question.rowKey
        )
      ) {

        questions.push({
          id: question.rowKey,
          question:
            question.Question,
          answerType:
            question.AnswerType,
          required:
            question.Required,
          options:
            question.Options
        });
      }
    }

    context.res = {
      status: 200,
      body: {
        success: true,
        template: {
          id:
            template.rowKey,
          templateName:
            template.TemplateName,
          categoryName:
            template.CategoryName,
          questions
        }
      }
    };

  } catch (error) {

    context.res = {
      status: 500,
      body: {
        success: false,
        error:
          error.message
      }
    };
  }
};
