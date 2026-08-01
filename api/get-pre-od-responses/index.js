const { PRE_OD_QUESTIONS } = require("../shared/preOdQuestions");
const { getTableClient } = require("../shared/tableHelper");
const { getWorkshopById } = require("../shared/workshopAccess");
const {
  listPreOdResponsesForWorkshop,
  listPreOdWorkshopSummaries,
} = require("../shared/preOdResponseStore");

function parseSrNos(value) {
  if (!value) {
    return [];
  }

  return String(value)
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => !Number.isNaN(item));
}

function personalizeQuestion(text, organizationName) {
  const company = organizationName || "the company";
  return String(text || "")
    .replace(/<<Company's>>/g, `${company}'s`)
    .replace(/<<Company>>/g, company);
}

async function loadParticipantNames(participantIds) {
  const names = new Map();
  const client = getTableClient("Participants");

  await Promise.all(
    participantIds.map(async (participantId) => {
      try {
        const entity = await client.getEntity("Participant", participantId);
        const firstName = String(entity.First_Name || "").trim();
        const lastName = String(entity.Last_Name || "").trim();
        const fullName = [firstName, lastName].filter(Boolean).join(" ");

        names.set(
          participantId,
          fullName || String(entity.Email || "Participant")
        );
      } catch {
        names.set(participantId, "Participant");
      }
    })
  );

  return names;
}

module.exports = async function (context, req) {
  try {
    const workshopId = req.query.workshopId;

    if (!workshopId) {
      const summaries = await listPreOdWorkshopSummaries();

      context.res = {
        status: 200,
        body: {
          success: true,
          summaries,
        },
      };
      return;
    }

    const workshop = await getWorkshopById(workshopId);

    if (!workshop) {
      context.res = {
        status: 404,
        body: {
          success: false,
          message: "Workshop not found.",
        },
      };
      return;
    }

    const assignedSrNos = parseSrNos(workshop.preOdQuestionSrNos);
    const questionMap = new Map(
      PRE_OD_QUESTIONS.map((item) => [item.srNo, item])
    );

    const questions = assignedSrNos
      .map((srNo) => questionMap.get(srNo))
      .filter(Boolean)
      .map((item) => ({
        srNo: item.srNo,
        category: item.category,
        question: personalizeQuestion(
          item.question,
          workshop.organizationName
        ),
      }));

    const responses = await listPreOdResponsesForWorkshop(workshopId);
    const participantIds = responses.map((item) => item.participantId);
    const participantNames = await loadParticipantNames(participantIds);

    const submissions = responses.map((response) => ({
      participantId: response.participantId,
      participantName:
        response.participantName ||
        participantNames.get(response.participantId) ||
        "Participant",
      organizationId: response.organizationId,
      submittedDate: response.submittedDate,
      answers: response.answers,
    }));

    context.res = {
      status: 200,
      body: {
        success: true,
        workshop: {
          id: workshop.id,
          workshopName: workshop.workshopName,
          organizationName: workshop.organizationName,
          preOdQuestionCount: workshop.preOdQuestionCount || questions.length,
        },
        questions,
        submissions,
        submissionCount: submissions.length,
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
