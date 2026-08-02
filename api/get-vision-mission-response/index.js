const { getTableClient } = require("../shared/tableHelper");

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

function emptyResponse(participantId, organizationId = "") {
  return {
    participantId,
    organizationId,
    workshopId: "",
    visionKeywords: [],
    missionKeywords: [],
    visionText: "",
    missionText: "",
    submittedDate: "",
  };
}

function mapEntity(entity, participantId) {
  return {
    participantId: entity.ParticipantId || participantId,
    organizationId: entity.OrganizationId || "",
    workshopId: entity.WorkshopId || entity.partitionKey || "",
    visionKeywords: parseJsonArray(entity.VisionKeywords),
    missionKeywords: parseJsonArray(entity.MissionKeywords),
    visionText: entity.VisionText || "",
    missionText: entity.MissionText || "",
    submittedDate: entity.SubmittedDate || "",
  };
}

module.exports = async function (context, req) {
  try {
    const participantId = req.query.participantId;
    const workshopId = String(req.query.workshopId || "").trim();

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

    const tableClient = await getTableClient("VisionMissionResponse");
    let entity = null;

    // Prefer the workshop-scoped row so each workshop has its own answers.
    if (workshopId) {
      try {
        entity = await tableClient.getEntity(workshopId, participantId);
      } catch {
        entity = null;
      }
    }

    // Legacy Participant row: only reuse when it belongs to this workshop.
    if (!entity) {
      try {
        const legacy = await tableClient.getEntity("Participant", participantId);
        const legacyWorkshopId = String(legacy.WorkshopId || "").trim();

        if (!workshopId) {
          entity = legacy;
        } else if (legacyWorkshopId && legacyWorkshopId === workshopId) {
          entity = legacy;
        }
      } catch {
        entity = null;
      }
    }

    context.res = {
      status: 200,
      body: {
        success: true,
        table: "VisionMissionResponse",
        data: entity
          ? mapEntity(entity, participantId)
          : emptyResponse(participantId),
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
