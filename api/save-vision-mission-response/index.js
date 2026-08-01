const { ensureTableClient } = require("../shared/tableHelper");
const { assertWorkshopEditable } = require("../shared/workshopAccess");

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
      workshopId,
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

    const access = await assertWorkshopEditable({
      workshopId,
      organizationId,
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

    const tableClient = await ensureTableClient("VisionMissionResponse");

    const submittedDate = new Date().toISOString();
    const resolvedWorkshopId =
      workshopId || access.workshop?.id || "";

    const entity = {
      partitionKey: "Participant",
      rowKey: participantId,
      ParticipantId: participantId,
      OrganizationId: organizationId || access.workshop?.organizationId || "",
      WorkshopId: resolvedWorkshopId,
      VisionKeywords: JSON.stringify(cleanedVisionKeywords),
      MissionKeywords: JSON.stringify(cleanedMissionKeywords),
      VisionText: cleanedVisionText || cleanedVisionKeywords.join(" "),
      MissionText: cleanedMissionText || cleanedMissionKeywords.join(" "),
      SubmittedDate: submittedDate,
    };

    try {
      await tableClient.getEntity("Participant", participantId);
      await tableClient.updateEntity(entity, "Replace");
    } catch {
      await tableClient.createEntity(entity);
    }

    if (resolvedWorkshopId) {
      const workshopEntity = {
        ...entity,
        partitionKey: String(resolvedWorkshopId),
        rowKey: participantId,
      };

      try {
        await tableClient.getEntity(String(resolvedWorkshopId), participantId);
        await tableClient.updateEntity(workshopEntity, "Replace");
      } catch {
        await tableClient.createEntity(workshopEntity);
      }
    }

    context.res = {
      status: 200,
      body: {
        success: true,
        message: "Vision & Mission saved successfully.",
        table: "VisionMissionResponse",
        data: {
          participantId,
          organizationId: organizationId || "",
          visionKeywords: cleanedVisionKeywords,
          missionKeywords: cleanedMissionKeywords,
          visionText: entity.VisionText,
          missionText: entity.MissionText,
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
