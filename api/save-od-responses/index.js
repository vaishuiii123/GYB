const {
  ensureTableClient,
  getTableClient,
  listPartition,
} = require("../shared/tableHelper");
const { assertWorkshopEditable } = require("../shared/workshopAccess");
const { loadParticipantDisplayName } = require("../shared/participantNames");

function buildOptionLookup(optionClient) {
  return listPartition(optionClient, "QuestionOption").then((allOptions) => {
    const lookup = new Map();

    for (const entity of allOptions) {
      const questionId = entity.QuestionId;
      const normalizedOption = String(entity.OptionText || "")
        .trim()
        .toLowerCase();

      if (!questionId || !normalizedOption) {
        continue;
      }

      lookup.set(`${questionId}::${normalizedOption}`, entity.rowKey);
    }

    return lookup;
  });
}

module.exports = async function (context, req) {
  try {
    const {
      participantId,
      workshopId,
      organizationId,
      templateId,
      answers,
      participantName: participantNameFromClient,
    } = req.body || {};

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

    if (!answers || typeof answers !== "object") {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "answers object is required.",
        },
      };
      return;
    }

    const access = await assertWorkshopEditable({
      workshopId,
      organizationId,
    });
    if (!access.allowed) {
      context.res = {
        status: access.status,
        body: {
          success: false,
          message: access.message,
        },
      };
      return;
    }

    const answerTable = await ensureTableClient("QuestionAnswer");
    const questionTable = getTableClient("Questions");
    const optionTable = getTableClient("QuestionOptions");
    const optionLookup = await buildOptionLookup(optionTable);
    const participantName =
      String(participantNameFromClient || "").trim() ||
      (await loadParticipantDisplayName(participantId));

    const savedAnswers = {};
    const now = new Date().toISOString();

    for (const [questionId, answerValue] of Object.entries(answers)) {
      const answerText = String(answerValue || "").trim();
      if (!answerText) {
        continue;
      }

      try {
        await questionTable.getEntity("Question", questionId);
      } catch {
        context.res = {
          status: 400,
          body: {
            success: false,
            message: `Question ${questionId} was not found in Questions table.`,
          },
        };
        return;
      }

      const optionId =
        optionLookup.get(
          `${questionId}::${answerText.trim().toLowerCase()}`
        ) || "";

      const rowKey = `${workshopId}_${questionId}`;
      const entity = {
        partitionKey: String(participantId),
        rowKey,
        ParticipantId: String(participantId),
        ParticipantName: participantName || "",
        WorkshopId: workshopId,
        OrganizationId: organizationId || "",
        TemplateId: templateId || "",
        QuestionId: questionId,
        OptionId: optionId,
        AnswerText: answerText,
        SubmittedDate: now,
      };

      try {
        await answerTable.getEntity(String(participantId), rowKey);
        await answerTable.updateEntity(entity, "Replace");
      } catch {
        await answerTable.createEntity(entity);
      }

      savedAnswers[questionId] = answerText;
    }

    context.res = {
      status: 200,
      body: {
        success: true,
        message: "Responses saved successfully.",
        table: "QuestionAnswer",
        data: {
          participantId,
          workshopId,
          participantName,
          answers: savedAnswers,
          submittedDate: now,
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
