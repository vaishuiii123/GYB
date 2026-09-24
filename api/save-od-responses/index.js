const {
  ensureTableClient,
  getTableClient,
  listPartition,
} = require("../shared/tableHelper");
const { assertWorkshopEditable } = require("../shared/workshopAccess");
const { loadParticipantDisplayName } = require("../shared/participantNames");
const {
  normalizeAttachmentList,
  serializeAttachmentsJson,
} = require("../shared/attachmentHelper");

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
      notes,
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
    const notesMap = notes && typeof notes === "object" ? notes : {};

    const questionIds = new Set([
      ...Object.keys(answers),
      ...Object.keys(notesMap),
      ...Object.keys(attachmentMap),
    ]);

    const savedAnswers = {};
    const savedNotes = {};
    const savedAttachments = {};
    const now = new Date().toISOString();

    for (const questionId of questionIds) {
      const answerText = String(answers[questionId] || "").trim();
      const noteText = String(notesMap[questionId] || "").trim();
      const hasAttachmentKey = Object.prototype.hasOwnProperty.call(
        attachmentMap,
        questionId
      );
      const attachmentList = hasAttachmentKey
        ? normalizeAttachmentList(attachmentMap[questionId])
        : null;

      if (!answerText && !noteText && !(attachmentList && attachmentList.length)) {
        if (!hasAttachmentKey) {
          continue;
        }
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

      const nextList = hasAttachmentKey
        ? attachmentList
        : normalizeAttachmentList(
            existing?.AttachmentsJson ||
              (existing?.AttachmentBlobPath
                ? {
                    fileName: existing.AttachmentName,
                    blobPath: existing.AttachmentBlobPath,
                    contentType: existing.AttachmentContentType,
                    size: existing.AttachmentSize,
                  }
                : [])
          );

      const primary = nextList[0] || null;

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
        NoteText: Object.prototype.hasOwnProperty.call(notesMap, questionId)
          ? noteText
          : String(existing?.NoteText || ""),
        AttachmentName: primary ? primary.fileName : "",
        AttachmentBlobPath: primary ? primary.blobPath : "",
        AttachmentContentType: primary
          ? primary.contentType
          : "",
        AttachmentSize: primary ? primary.size || 0 : 0,
        AttachmentsJson: serializeAttachmentsJson(nextList),
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

      if (entity.NoteText) {
        savedNotes[questionId] = entity.NoteText;
      }

      if (nextList.length > 0) {
        savedAttachments[questionId] = nextList;
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
          notes: savedNotes,
          attachments: savedAttachments,
          submittedDate: now,
        },
      },
    };

    try {
      const { invalidatePrefix } = require("../shared/listCache");
      invalidatePrefix(`cat-questions:`);
    } catch {
      // ignore cache invalidation failures
    }
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
