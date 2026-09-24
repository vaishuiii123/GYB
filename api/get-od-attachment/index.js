const { getTableClient } = require("../shared/tableHelper");
const { downloadAttachmentBlob } = require("../shared/blobHelper");
const {
  buildContentDisposition,
  attachmentsFromAnswerEntity,
} = require("../shared/attachmentHelper");

module.exports = async function (context, req) {
  try {
    const participantId = String(req.query.participantId || "").trim();
    const workshopId = String(req.query.workshopId || "").trim();
    const questionId = String(req.query.questionId || "").trim();
    const requestedBlobPath = String(req.query.blobPath || "").trim();
    const inline =
      String(req.query.inline || "").trim() === "1" ||
      String(req.query.inline || "")
        .trim()
        .toLowerCase() === "true";

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

    const list = attachmentsFromAnswerEntity(entity);
    const selected = requestedBlobPath
      ? list.find((item) => item.blobPath === requestedBlobPath)
      : list[0];

    const blobPath = String(selected?.blobPath || "").trim();
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
      String(selected.fileName || "attachment").replace(
        /[<>:"/\\|?*\x00-\x1f]+/g,
        "_"
      ) || "attachment";

    context.res = {
      status: 200,
      headers: {
        "Content-Type":
          selected.contentType ||
          downloaded.contentType ||
          "application/octet-stream",
        "Content-Disposition": buildContentDisposition(fileName, inline),
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
