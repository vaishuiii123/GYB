const { getWorkshopById } = require("../shared/workshopAccess");
const { getFeedbackQuestions } = require("../shared/workshopFeedback");
const {
  getFeedback,
  getFeedbackAccessStatus,
  listFeedbackForWorkshop,
} = require("../shared/workshopFeedbackStore");
const {
  loadAllParticipantRecords,
  loadParticipantDisplayName,
  loadStoredParticipantNames,
  pickDisplayName,
} = require("../shared/participantNames");

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
      const participantIds = submissions.map((item) => item.participantId);
      const [participantRecords, storedNames] = await Promise.all([
        loadAllParticipantRecords(),
        loadStoredParticipantNames(participantIds),
      ]);

      const resolvedSubmissions = await Promise.all(
        submissions.map(async (submission) => {
          const id = String(submission.participantId || "").trim();
          const record = participantRecords.get(id);
          let displayName = pickDisplayName(
            record?.displayName,
            submission.participantName,
            storedNames.get(id)
          );

          if (!displayName) {
            displayName = await loadParticipantDisplayName(id);
          }

          return {
            ...submission,
            participantId: id,
            participantName: displayName || "Unknown",
            firstName: record?.firstName || "",
            lastName: record?.lastName || "",
            email: record?.email || "",
          };
        })
      );

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
          submissions: resolvedSubmissions,
          submissionCount: resolvedSubmissions.length,
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
        participantName: existing?.participantName || "",
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
