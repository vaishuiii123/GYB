const { getTableClient } = require("../shared/tableHelper");
const { assertWorkshopEditable } = require("../shared/workshopAccess");
const { uploadAttachmentBlob } = require("../shared/blobHelper");
const {
  isAttachmentsApplicable,
  isAllowedAttachmentFile,
  MAX_ATTACHMENT_BYTES,
  sanitizeFileName,
} = require("../shared/attachmentHelper");

module.exports = async function (context, req) {
  try {
    const body = req.body || {};
    const {
      participantId,
      workshopId,
      organizationId,
      questionId,
      fileName,
      contentType,
      base64,
    } = body;

    if (!participantId || !workshopId || !questionId || !fileName || !base64) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message:
            "participantId, workshopId, questionId, fileName, and base64 are required.",
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

    let question;
    try {
      question = await getTableClient("Questions").getEntity(
        "Question",
        String(questionId)
      );
    } catch {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: `Question ${questionId} was not found.`,
        },
      };
      return;
    }

    if (!isAttachmentsApplicable(question.AttachmentsApplicable)) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "Attachments are not applicable for this question.",
        },
      };
      return;
    }

    const safeName = sanitizeFileName(fileName);
    if (!isAllowedAttachmentFile(safeName, contentType)) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message:
            "Unsupported file type. Allowed: Excel, Word, PowerPoint, PDF, text, and images.",
        },
      };
      return;
    }

    const buffer = Buffer.from(String(base64), "base64");
    if (!buffer.length) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "Attachment file is empty.",
        },
      };
      return;
    }

    if (buffer.length > MAX_ATTACHMENT_BYTES) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "Attachment exceeds the 10 MB size limit.",
        },
      };
      return;
    }

    const blobPath = [
      String(workshopId),
      String(participantId),
      String(questionId),
      `${Date.now()}_${safeName}`,
    ].join("/");

    const uploaded = await uploadAttachmentBlob(
      blobPath,
      buffer,
      contentType || "application/octet-stream"
    );

    context.res = {
      status: 200,
      body: {
        success: true,
        message: "Attachment uploaded successfully.",
        data: {
          questionId: String(questionId),
          fileName: safeName,
          contentType: contentType || "application/octet-stream",
          size: buffer.length,
          blobPath: uploaded.blobPath,
        },
      },
    };
  } catch (error) {
    context.log(error);
    context.res = {
      status: 500,
      body: {
        success: false,
        message: error.message,
      },
    };
  }
};
