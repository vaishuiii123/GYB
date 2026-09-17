const { getTableClient } = require("../shared/tableHelper");
const {
  getOrLoad,
  visionMissionResponseKey,
} = require("../shared/listCache");

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

async function loadVisionMissionResponse(participantId, workshopId) {
  const tableClient = await getTableClient("VisionMissionResponse");
  let entity = null;

  if (workshopId) {
    try {
      const workshopRow = await tableClient.getEntity(workshopId, participantId);
      if (belongsToParticipant(workshopRow, participantId)) {
        entity = workshopRow;
      }
    } catch {
      entity = null;
    }
  }

  if (!entity) {
    try {
      const legacy = await tableClient.getEntity("Participant", participantId);
      if (belongsToParticipant(legacy, participantId)) {
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

  return entity
    ? mapEntity(entity, participantId)
    : emptyResponse(participantId, "", workshopId);
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

    const cacheKey = visionMissionResponseKey(participantId, workshopId);
    const { value: data, cacheHit } = await getOrLoad(
      cacheKey,
      () => loadVisionMissionResponse(participantId, workshopId),
      45 * 1000
    );

    context.res = {
      status: 200,
      headers: {
        "Cache-Control": "private, max-age=30",
        "X-List-Cache": cacheHit ? "HIT" : "MISS",
      },
      body: {
        success: true,
        table: "VisionMissionResponse",
        data,
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
