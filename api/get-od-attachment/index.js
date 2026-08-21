const { getTableClient } = require("../shared/tableHelper");
const { downloadAttachmentBlob } = require("../shared/blobHelper");

module.exports = async function (context, req) {
  try {
    const participantId = String(req.query.participantId || "").trim();
    const workshopId = String(req.query.workshopId || "").trim();
    const questionId = String(req.query.questionId || "").trim();

    if (!participantId || !workshopId || !questionId) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "participantId, workshopId, and questionId are required.",
        },
      };
      return;
    }

    const answerTable = getTableClient("QuestionAnswer");
    const rowKey = `${workshopId}_${questionId}`;
    let entity;

    try {
      entity = await answerTable.getEntity(participantId, rowKey);
    } catch {
      context.res = {
        status: 404,
        body: {
          success: false,
          message: "Attachment not found.",
        },
      };
      return;
    }

    const blobPath = String(entity.AttachmentBlobPath || "").trim();
    if (!blobPath) {
      context.res = {
        status: 404,
        body: {
          success: false,
          message: "No attachment is stored for this response.",
        },
      };
      return;
    }

    const downloaded = await downloadAttachmentBlob(blobPath);
    const fileName =
      String(entity.AttachmentName || "attachment").replace(
        /[<>:"/\\|?*\x00-\x1f]+/g,
        "_"
      ) || "attachment";

    context.res = {
      status: 200,
      headers: {
        "Content-Type":
          entity.AttachmentContentType ||
          downloaded.contentType ||
          "application/octet-stream",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
      body: downloaded.buffer,
      isRaw: true,
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
