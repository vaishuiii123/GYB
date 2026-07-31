const { TableClient } = require("@azure/data-tables");

function cleanKeywords(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

module.exports = async function (context, req) {
  try {
    const {
      participantId,
      organizationId,
      visionKeywords,
      missionKeywords,
      visionText,
      missionText,
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

    const cleanedVisionKeywords = cleanKeywords(visionKeywords);
    const cleanedMissionKeywords = cleanKeywords(missionKeywords);
    const cleanedVisionText = String(visionText || "").trim();
    const cleanedMissionText = String(missionText || "").trim();

    if (
      cleanedVisionKeywords.length === 0 &&
      cleanedMissionKeywords.length === 0
    ) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "Add at least one keyword to Vision or Mission.",
        },
      };
      return;
    }

    const tableClient = TableClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING,
      "VisionMissionResponse"
    );

    const entity = {
      partitionKey: "Participant",
      rowKey: participantId,
      ParticipantId: participantId,
      OrganizationId: organizationId || "",
      VisionKeywords: JSON.stringify(cleanedVisionKeywords),
      MissionKeywords: JSON.stringify(cleanedMissionKeywords),
      VisionText: cleanedVisionText,
      MissionText: cleanedMissionText,
      SubmittedDate: new Date().toISOString(),
    };

    try {
      await tableClient.getEntity("Participant", participantId);
      await tableClient.updateEntity(entity, "Replace");
    } catch {
      await tableClient.createEntity(entity);
    }

    context.res = {
      status: 200,
      body: {
        success: true,
        message: "Vision & Mission saved successfully.",
        data: {
          participantId,
          organizationId: organizationId || "",
          visionKeywords: cleanedVisionKeywords,
          missionKeywords: cleanedMissionKeywords,
          visionText: cleanedVisionText,
          missionText: cleanedMissionText,
          submittedDate: entity.SubmittedDate,
        },
      },
    };
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
