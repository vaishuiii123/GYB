const { getPreOdResponse } = require("../shared/preOdResponseStore");
const { downloadAttachmentBlob } = require("../shared/blobHelper");

module.exports = async function (context, req) {
  try {
    const participantId = String(req.query.participantId || "").trim();
    const workshopId = String(req.query.workshopId || "").trim();
    const questionSrNo = String(req.query.questionSrNo || "").trim();

    if (!participantId || !workshopId || !questionSrNo) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "participantId, workshopId, and questionSrNo are required.",
        },
      };
      return;
    }

    const saved = await getPreOdResponse(workshopId, participantId);
    const attachment = saved?.attachments?.[questionSrNo];

    if (!attachment?.blobPath) {
      context.res = {
        status: 404,
        body: {
          success: false,
          message: "No attachment is stored for this response.",
        },
      };
      return;
    }

    const downloaded = await downloadAttachmentBlob(attachment.blobPath);
    const fileName =
      String(attachment.fileName || "attachment").replace(
        /[<>:"/\\|?*\x00-\x1f]+/g,
        "_"
      ) || "attachment";

    context.res = {
      status: 200,
      headers: {
        "Content-Type":
          attachment.contentType ||
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
