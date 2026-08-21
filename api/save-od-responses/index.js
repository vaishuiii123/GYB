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
      attachments,
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

    const attachmentMap =
      attachments && typeof attachments === "object" ? attachments : {};

    const questionIds = new Set([
      ...Object.keys(answers),
      ...Object.keys(attachmentMap),
    ]);

    const savedAnswers = {};
    const savedAttachments = {};
    const now = new Date().toISOString();

    for (const questionId of questionIds) {
      const answerText = String(answers[questionId] || "").trim();
      const attachmentMeta = attachmentMap[questionId];

      if (!answerText && !attachmentMeta) {
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

      const optionId = answerText
        ? optionLookup.get(`${questionId}::${answerText.trim().toLowerCase()}`) ||
          ""
        : "";

      const rowKey = `${workshopId}_${questionId}`;
      let existing = null;
      try {
        existing = await answerTable.getEntity(String(participantId), rowKey);
      } catch {
        existing = null;
      }

      const nextAttachmentName = attachmentMeta
        ? String(attachmentMeta.fileName || attachmentMeta.name || "").trim()
        : String(existing?.AttachmentName || "").trim();
      const nextAttachmentBlobPath = attachmentMeta
        ? String(attachmentMeta.blobPath || "").trim()
        : String(existing?.AttachmentBlobPath || "").trim();
      const nextAttachmentContentType = attachmentMeta
        ? String(
            attachmentMeta.contentType || "application/octet-stream"
          ).trim()
        : String(existing?.AttachmentContentType || "").trim();
      const nextAttachmentSize = attachmentMeta
        ? Number(attachmentMeta.size || 0)
        : Number(existing?.AttachmentSize || 0);

      const entity = {
        partitionKey: String(participantId),
        rowKey,
        ParticipantId: String(participantId),
        ParticipantName: participantName || "",
        WorkshopId: workshopId,
        OrganizationId: organizationId || "",
        TemplateId: templateId || "",
        QuestionId: questionId,
        OptionId: optionId || existing?.OptionId || "",
        AnswerText: answerText || existing?.AnswerText || "",
        AttachmentName: nextAttachmentName,
        AttachmentBlobPath: nextAttachmentBlobPath,
        AttachmentContentType: nextAttachmentContentType,
        AttachmentSize: nextAttachmentSize || 0,
        SubmittedDate: now,
      };

      if (existing) {
        await answerTable.updateEntity(entity, "Replace");
      } else {
        await answerTable.createEntity(entity);
      }

      if (entity.AnswerText) {
        savedAnswers[questionId] = entity.AnswerText;
      }

      if (entity.AttachmentBlobPath) {
        savedAttachments[questionId] = {
          fileName: entity.AttachmentName,
          blobPath: entity.AttachmentBlobPath,
          contentType: entity.AttachmentContentType,
          size: entity.AttachmentSize,
        };
      }
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
          attachments: savedAttachments,
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
