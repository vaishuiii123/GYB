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
const { parseCustomQuestions } = require("../shared/preOdCustomQuestions");
const {
  normalizeAttachmentList,
} = require("../shared/attachmentHelper");

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

function cleanAttachments(rawAttachments, assignedSrNos) {
  const attachments = {};
  const source =
    rawAttachments && typeof rawAttachments === "object" ? rawAttachments : {};

  for (const srNo of assignedSrNos) {
    const key = String(srNo);
    const item = source[key] ?? source[srNo];
    if (item == null) {
      continue;
    }

    const list = normalizeAttachmentList(item)
      .filter((entry) => entry.blobPath && entry.fileName)
      .map((entry) => ({
        id: entry.id || entry.blobPath,
        fileName: entry.fileName,
        blobPath: entry.blobPath,
        contentType: entry.contentType || "application/octet-stream",
        size: Number(entry.size) || 0,
      }));

    if (list.length === 0) {
      continue;
    }

    // Persist as an array so multiple files are supported going forward.
    attachments[key] = list;
  }

  return attachments;
}

function mergeAttachments(existingAttachments, incomingAttachments, assignedSrNos) {
  const merged = {
    ...(existingAttachments && typeof existingAttachments === "object"
      ? existingAttachments
      : {}),
  };
  const incoming =
    incomingAttachments && typeof incomingAttachments === "object"
      ? incomingAttachments
      : {};

  // Keys present in the payload are authoritative (including explicit clears).
  for (const [key, value] of Object.entries(incoming)) {
    const list = normalizeAttachmentList(value);
    if (list.length === 0) {
      delete merged[key];
    } else {
      merged[key] = list;
    }
  }

  return cleanAttachments(merged, assignedSrNos);
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
    const customSrNos = parseCustomQuestions(workshop.preOdCustomQuestions).map(
      (item) => item.srNo
    );
    const allSrNos = [...filteredSrNos, ...customSrNos];

    if (allSrNos.length === 0) {
      context.res = {
        status: 404,
        body: {
          success: false,
          message: "No Pre-Organizational Development questions are assigned to this workshop.",
        },
      };
      return;
    }

    const existing = await getPreOdResponse(workshop.id, participantId);
    const cleanedAnswers = cleanAnswers(answers, allSrNos);
    const cleanedAttachments = mergeAttachments(
      existing?.attachments || {},
      attachments,
      allSrNos
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
          ? "Pre-Organizational Development draft saved successfully."
          : "Pre-Organizational Development submitted successfully.",
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
