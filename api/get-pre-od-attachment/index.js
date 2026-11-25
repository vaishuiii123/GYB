const { getPreOdResponse } = require("../shared/preOdResponseStore");
const { downloadAttachmentBlob } = require("../shared/blobHelper");
const {
  buildContentDisposition,
  normalizeAttachmentList,
} = require("../shared/attachmentHelper");

module.exports = async function (context, req) {
  try {
    const participantId = String(req.query.participantId || "").trim();
    const workshopId = String(req.query.workshopId || "").trim();
    const questionSrNo = String(req.query.questionSrNo || "").trim();
    const requestedBlobPath = String(req.query.blobPath || "").trim();
    const inline =
      String(req.query.inline || "").trim() === "1" ||
      String(req.query.inline || "")
        .trim()
        .toLowerCase() === "true";

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
    const list = normalizeAttachmentList(saved?.attachments?.[questionSrNo]);
    const selected = requestedBlobPath
      ? list.find((item) => item.blobPath === requestedBlobPath)
      : list[0];

    if (!selected?.blobPath) {
      context.res = {
        status: 404,
        body: {
          success: false,
          message: "No attachment is stored for this response.",
        },
      };
      return;
    }

    const downloaded = await downloadAttachmentBlob(selected.blobPath);
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
