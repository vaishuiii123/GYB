const { getTableClient, listAnswersForWorkshop } = require("../shared/tableHelper");

module.exports = async function (context, req) {
  try {
    const participantId = req.query.participantId;
    const workshopId = req.query.workshopId;

    if (!participantId || !workshopId) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "participantId and workshopId are required.",
        },
      };
      return;
    }

    const answerTable = getTableClient("QuestionAnswer");
    const answerPayload = await listAnswersForWorkshop(
      answerTable,
      participantId,
      workshopId
    );

    context.res = {
      status: 200,
      body: {
        success: true,
        table: "QuestionAnswer",
        data: {
          participantId,
          workshopId,
          organizationId: answerPayload.organizationId,
          templateId: answerPayload.templateId,
          answers: answerPayload.answers,
          submittedDate: answerPayload.submittedDate,
        },
      },
    };
  } catch (error) {
    context.res = {
      status: 500,
      body: {
        success: false,
        message: error.message,
      },
    };
  }
};
