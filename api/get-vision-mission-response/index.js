const { TableClient } = require("@azure/data-tables");

function parseJsonArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.map((item) => String(item || "").trim()).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

module.exports = async function (context, req) {
  try {
    const participantId = req.query.participantId;

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

    const tableClient = TableClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING,
      "VisionMissionResponse"
    );

    try {
      const entity = await tableClient.getEntity(
        "Participant",
        participantId
      );

      context.res = {
        status: 200,
        body: {
          success: true,
          data: {
            participantId: entity.ParticipantId || participantId,
            organizationId: entity.OrganizationId || "",
            visionKeywords: parseJsonArray(entity.VisionKeywords),
            missionKeywords: parseJsonArray(entity.MissionKeywords),
            visionText: entity.VisionText || "",
            missionText: entity.MissionText || "",
            submittedDate: entity.SubmittedDate || "",
          },
        },
      };
    } catch {
      context.res = {
        status: 200,
        body: {
          success: true,
          data: {
            participantId,
            organizationId: "",
            visionKeywords: [],
            missionKeywords: [],
            visionText: "",
            missionText: "",
            submittedDate: "",
          },
        },
      };
    }
  } catch (error) {
    context.res = {
      status: 500,
      body: {
        success: false,
        message: error.message,
      },
    };
  }
};
