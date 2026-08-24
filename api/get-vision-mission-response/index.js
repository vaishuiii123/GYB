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

function emptyResponse(participantId, organizationId = "", workshopId = "") {
  return {
    participantId,
    organizationId,
    workshopId: workshopId || "",
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

/** Only accept a row that belongs to this participant. */
function belongsToParticipant(entity, participantId) {
  if (!entity || !participantId) {
    return false;
  }

  const rowKey = String(entity.rowKey || "").trim();
  const storedParticipantId = String(entity.ParticipantId || "").trim();
  const expected = String(participantId).trim();

  if (rowKey && rowKey !== expected) {
    return false;
  }

  if (storedParticipantId && storedParticipantId !== expected) {
    return false;
  }

  return rowKey === expected || storedParticipantId === expected;
}

module.exports = async function (context, req) {
  try {
    const participantId = String(req.query.participantId || "").trim();
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

    // Workshop-scoped row only (each participant + workshop is isolated).
    if (workshopId) {
      try {
        const workshopRow = await tableClient.getEntity(
          workshopId,
          participantId
        );
        if (belongsToParticipant(workshopRow, participantId)) {
          entity = workshopRow;
        }
      } catch {
        entity = null;
      }
    }

    // Legacy Participant row: only when it is for this participant AND this workshop.
    if (!entity) {
      try {
        const legacy = await tableClient.getEntity("Participant", participantId);
        if (!belongsToParticipant(legacy, participantId)) {
          // ignore
        } else {
          const legacyWorkshopId = String(legacy.WorkshopId || "").trim();

          if (!workshopId) {
            entity = legacy;
          } else if (legacyWorkshopId && legacyWorkshopId === workshopId) {
            entity = legacy;
          }
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
          : emptyResponse(participantId, "", workshopId),
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
