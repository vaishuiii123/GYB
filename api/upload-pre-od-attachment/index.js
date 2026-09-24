const {
  getWorkshopById,
  getWorkshopForOrganization,
} = require("../shared/workshopAccess");
const { assertPreOdFillable } = require("../shared/preOdAccess");
const { uploadAttachmentBlob } = require("../shared/blobHelper");
const {
  isAllowedAttachmentFile,
  MAX_ATTACHMENT_BYTES,
  sanitizeFileName,
} = require("../shared/attachmentHelper");
const { parseCustomQuestions } = require("../shared/preOdCustomQuestions");

function parseSrNos(value) {
  if (!value) {
    return [];
  }

  return String(value)
    .split(",")
    .map((item) => String(item).trim())
    .filter(Boolean);
}

module.exports = async function (context, req) {
  try {
    const body = req.body || {};
    const {
      participantId,
      workshopId,
      organizationId,
      questionSrNo,
      fileName,
      contentType,
      base64,
    } = body;

    if (
      !participantId ||
      !workshopId ||
      !questionSrNo ||
      !fileName ||
      !base64
    ) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message:
            "participantId, workshopId, questionSrNo, fileName, and base64 are required.",
        },
      };
      return;
    }

    const access = await assertPreOdFillable({
      workshopId,
      organizationId,
      getWorkshopById,
      getWorkshopForOrganization,
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

    const workshop = access.workshop;
    const bankSrNos = parseSrNos(workshop.preOdQuestionSrNos);
    const customSrNos = parseCustomQuestions(workshop.preOdCustomQuestions).map(
      (item) => String(item.srNo)
    );
    const assignedSrNos = [
      ...new Set([...bankSrNos.map(String), ...customSrNos]),
    ];
    const srNo = String(questionSrNo).trim();

    if (!assignedSrNos.includes(srNo)) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: `Question ${srNo} is not assigned to this workshop.`,
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
      "pre-od",
      String(workshop.id),
      String(participantId),
      srNo,
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
          questionSrNo: srNo,
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
