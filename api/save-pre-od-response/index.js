const { PRE_OD_QUESTIONS } = require("../shared/preOdQuestions");
const { getTableClient } = require("../shared/tableHelper");
const {
  getWorkshopById,
  getWorkshopForOrganization,
} = require("../shared/workshopAccess");
const { assertPreOdFillable } = require("../shared/preOdAccess");
const {
  getPreOdResponse,
  savePreOdResponse,
} = require("../shared/preOdResponseStore");
const {
  getAttachmentFlag,
  resolveWorkshopPreOdAttachments,
} = require("../shared/preOdAttachments");

function parseSrNos(value) {
  if (!value) {
    return [];
  }

  return String(value)
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => !Number.isNaN(item));
}

function cleanAnswers(rawAnswers, assignedSrNos) {
  const answers = {};
  const source =
    rawAnswers && typeof rawAnswers === "object" ? rawAnswers : {};

  for (const srNo of assignedSrNos) {
    const key = String(srNo);
    const value = String(source[key] ?? source[srNo] ?? "").trim();
    answers[key] = value;
  }

  return answers;
}

function cleanAttachments(rawAttachments, assignedSrNos, attachmentsMap) {
  const attachments = {};
  const source =
    rawAttachments && typeof rawAttachments === "object" ? rawAttachments : {};

  for (const srNo of assignedSrNos) {
    const key = String(srNo);
    if (getAttachmentFlag(attachmentsMap, key) !== "Y") {
      continue;
    }

    const item = source[key] || source[srNo];
    if (!item || typeof item !== "object") {
      continue;
    }

    const blobPath = String(item.blobPath || "").trim();
    const fileName = String(item.fileName || "").trim();
    if (!blobPath || !fileName) {
      continue;
    }

    attachments[key] = {
      fileName,
      blobPath,
      contentType: String(item.contentType || "application/octet-stream"),
      size: Number(item.size) || 0,
    };
  }

  return attachments;
}

async function loadParticipantName(participantId) {
  const client = getTableClient("Participants");

  try {
    const entity = await client.getEntity("Participant", participantId);
    const firstName = String(entity.First_Name || "").trim();
    const lastName = String(entity.Last_Name || "").trim();
    const fullName = [firstName, lastName].filter(Boolean).join(" ");

    return fullName || String(entity.Email || "");
  } catch {
    return "";
  }
}

module.exports = async function (context, req) {
  try {
    const {
      participantId,
      organizationId,
      workshopId,
      answers,
      attachments,
      isDraft,
    } = req.body || {};

    if (!participantId) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "participantId is required.",
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
    const assignedSrNos = parseSrNos(workshop.preOdQuestionSrNos);
    const validSrNos = new Set(PRE_OD_QUESTIONS.map((item) => item.srNo));
    const filteredSrNos = assignedSrNos.filter((srNo) => validSrNos.has(srNo));
    const attachmentsMap = await resolveWorkshopPreOdAttachments(
      workshop,
      filteredSrNos
    );

    if (filteredSrNos.length === 0) {
      context.res = {
        status: 404,
        body: {
          success: false,
          message: "No Pre OD questions are assigned to this workshop.",
        },
      };
      return;
    }

    const existing = await getPreOdResponse(workshop.id, participantId);
    const cleanedAnswers = cleanAnswers(answers, filteredSrNos);
    const cleanedAttachments = cleanAttachments(
      {
        ...(existing?.attachments || {}),
        ...(attachments && typeof attachments === "object" ? attachments : {}),
      },
      filteredSrNos,
      attachmentsMap
    );
    const participantName = await loadParticipantName(participantId);
    const saved = await savePreOdResponse({
      workshopId: workshop.id,
      participantId,
      organizationId: organizationId || workshop.organizationId || "",
      workshopName: workshop.workshopName || "",
      participantName,
      answers: cleanedAnswers,
      attachments: cleanedAttachments,
    });

    context.res = {
      status: 200,
      body: {
        success: true,
        message: isDraft
          ? "Pre OD draft saved successfully."
          : "Pre OD submitted successfully.",
        data: {
          participantId,
          workshopId: workshop.id,
          answers: saved.answers,
          attachments: saved.attachments,
          submittedDate: saved.submittedDate,
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
