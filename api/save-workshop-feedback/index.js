const { getTableClient } = require("../shared/tableHelper");
const { getWorkshopById } = require("../shared/workshopAccess");
const {
  getFeedback,
  getFeedbackAccessStatus,
  validateAnswers,
  saveFeedback,
} = require("../shared/workshopFeedbackStore");

async function loadParticipantName(participantId) {
  try {
    const client = getTableClient("Participants");
    const entity = await client.getEntity("Participant", participantId);
    const firstName = String(entity.First_Name || "").trim();
    const lastName = String(entity.Last_Name || "").trim();
    return (
      [firstName, lastName].filter(Boolean).join(" ") ||
      String(entity.Email || "")
    );
  } catch {
    return "";
  }
}

module.exports = async function (context, req) {
  try {
    const { participantId, organizationId, workshopId, answers } =
      req.body || {};

    if (!participantId || !workshopId) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "participantId and workshopId are required.",
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

    const existing = await getFeedback(workshopId, participantId);
    const access = getFeedbackAccessStatus(workshop, existing);

    if (!access.canSubmit) {
      context.res = {
        status: access.submitted ? 409 : 403,
        body: {
          success: false,
          message: access.message,
        },
      };
      return;
    }

    const validated = validateAnswers(answers);
    if (!validated.ok) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: validated.message,
        },
      };
      return;
    }

    const participantName = await loadParticipantName(participantId);
    const saved = await saveFeedback({
      workshopId: workshop.id,
      participantId,
      organizationId: organizationId || workshop.organizationId || "",
      workshopName: workshop.workshopName || "",
      participantName,
      answers: validated.answers,
    });

    context.res = {
      status: 200,
      body: {
        success: true,
        message: "Feedback submitted successfully.",
        data: saved,
      },
    };
  } catch (error) {
    context.log(error);

    if (error.statusCode === 409) {
      context.res = {
        status: 409,
        body: {
          success: false,
          message: "You have already submitted feedback for this workshop.",
        },
      };
      return;
    }

    context.res = {
      status: 500,
      body: {
        success: false,
        message: error.message,
      },
    };
  }
};
