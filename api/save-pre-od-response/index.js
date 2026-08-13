const { PRE_OD_QUESTIONS } = require("../shared/preOdQuestions");
const { getTableClient } = require("../shared/tableHelper");
const {
  getWorkshopById,
  getWorkshopForOrganization,
} = require("../shared/workshopAccess");
const { assertPreOdFillable } = require("../shared/preOdAccess");
const { savePreOdResponse } = require("../shared/preOdResponseStore");

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
    const { participantId, organizationId, workshopId, answers, isDraft } = req.body || {};

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
    const validSrNos = new Set(
      PRE_OD_QUESTIONS.map((item) => item.srNo)
    );
    const filteredSrNos = assignedSrNos.filter((srNo) => validSrNos.has(srNo));

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

    const cleanedAnswers = cleanAnswers(answers, filteredSrNos);
    const participantName = await loadParticipantName(participantId);
    const saved = await savePreOdResponse({
      workshopId: workshop.id,
      participantId,
      organizationId: organizationId || workshop.organizationId || "",
      workshopName: workshop.workshopName || "",
      participantName,
      answers: cleanedAnswers,
    });

    context.res = {
      status: 200,
      body: {
        success: true,
        message: "Pre OD submitted successfully.",
        data: {
          participantId,
          workshopId: workshop.id,
          answers: saved.answers,
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
