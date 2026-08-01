const { getTableClient } = require("../shared/tableHelper");
const { getWorkshopById } = require("../shared/workshopAccess");
const { getFeedbackQuestions } = require("../shared/workshopFeedback");
const {
  getFeedback,
  getFeedbackAccessStatus,
  listFeedbackForWorkshop,
} = require("../shared/workshopFeedbackStore");

async function loadParticipantName(participantId) {
  try {
    const client = getTableClient("Participants");
    const entity = await client.getEntity("Participant", participantId);
    const firstName = String(entity.First_Name || "").trim();
    const lastName = String(entity.Last_Name || "").trim();
    return [firstName, lastName].filter(Boolean).join(" ") || "Participant";
  } catch {
    return "Participant";
  }
}

module.exports = async function (context, req) {
  try {
    const workshopId = req.query.workshopId;
    const participantId = req.query.participantId;
    const adminView = String(req.query.admin || "") === "true";

    if (!workshopId) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "workshopId is required.",
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

    const questions = getFeedbackQuestions();

    if (adminView) {
      const submissions = await listFeedbackForWorkshop(workshopId);

      context.res = {
        status: 200,
        body: {
          success: true,
          workshop: {
            id: workshop.id,
            workshopName: workshop.workshopName,
            organizationName: workshop.organizationName,
            endDate: workshop.endDate,
          },
          questions,
          submissions,
          submissionCount: submissions.length,
        },
      };
      return;
    }

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

    const existing = await getFeedback(workshopId, participantId);
    const access = getFeedbackAccessStatus(workshop, existing);

    context.res = {
      status: 200,
      body: {
        success: true,
        workshop: {
          id: workshop.id,
          workshopName: workshop.workshopName,
          organizationName: workshop.organizationName,
          endDate: workshop.endDate,
        },
        questions,
        available: access.available,
        canSubmit: access.canSubmit,
        submitted: access.submitted,
        message: access.message,
        answers: existing?.answers || {},
        submittedDate: existing?.submittedDate || "",
        participantName:
          existing?.participantName ||
          (await loadParticipantName(participantId)),
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
