const { ensureTableClient } = require("../shared/tableHelper");
const { getWorkshopById } = require("../shared/workshopAccess");
const {
  buildWorkshopResponsePayload,
  isWorkshopEnded,
} = require("../shared/workshopResponseStore");
const { listPreOdWorkshopSummaries } = require("../shared/preOdResponseStore");

/** Short TTL so live poll refreshes cheaply without redoing Azure scans. */
const RESPONSE_CACHE_TTL_MS = 8_000;
const responsePayloadCache = new Map();

function getCachedPayload(workshopId) {
  const entry = responsePayloadCache.get(String(workshopId));
  if (!entry) {
    return null;
  }
  if (Date.now() - entry.savedAt > RESPONSE_CACHE_TTL_MS) {
    responsePayloadCache.delete(String(workshopId));
    return null;
  }
  return entry.payload;
}

function setCachedPayload(workshopId, payload) {
  responsePayloadCache.set(String(workshopId), {
    savedAt: Date.now(),
    payload,
  });
}

async function countDistinctParticipantsByWorkshop(tableName) {
  const counts = new Map();
  const seen = new Set();
  const tableClient = await ensureTableClient(tableName);

  try {
    for await (const entity of tableClient.listEntities()) {
      const workshopId = String(entity.WorkshopId || "");
      const participantId = String(
        entity.ParticipantId || entity.partitionKey || ""
      );

      if (!workshopId || !participantId) {
        continue;
      }

      const key = `${workshopId}::${participantId}`;
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      counts.set(workshopId, (counts.get(workshopId) || 0) + 1);
    }
  } catch {
    // ignore
  }

  return counts;
}

async function listEndedWorkshopSummaries() {
  const client = await ensureTableClient("Workshop");
  const ended = [];

  for await (const entity of client.listEntities({
    queryOptions: { filter: "PartitionKey eq 'Workshop'" },
  })) {
    const workshop = {
      id: entity.rowKey,
      workshopName: entity.WorkshopName || "",
      organizationName: entity.OrganizationName || "",
      organizationId: entity.OrganizationId || "",
      startDate: entity.StartDate || "",
      endDate: entity.EndDate || "",
    };

    if (isWorkshopEnded(workshop)) {
      ended.push(workshop);
    }
  }

  const [preOdSummaries, odCounts, actionableCounts] = await Promise.all([
    listPreOdWorkshopSummaries(),
    countDistinctParticipantsByWorkshop("QuestionAnswer"),
    countDistinctParticipantsByWorkshop("ActionableItem"),
  ]);

  const preOdMap = new Map(
    preOdSummaries.map((item) => [item.workshopId, item.submissionCount])
  );

  return ended
    .map((workshop) => {
      const preOdCount = preOdMap.get(workshop.id) || 0;
      const odCount = odCounts.get(workshop.id) || 0;
      const actionableCount = actionableCounts.get(workshop.id) || 0;
      const totalSignal = preOdCount + odCount + actionableCount;

      if (totalSignal === 0) {
        return null;
      }

      return {
        workshopId: workshop.id,
        workshopName: workshop.workshopName,
        organizationName: workshop.organizationName,
        endDate: workshop.endDate,
        counts: {
          preOd: preOdCount,
          odChart: odCount,
          actionables: actionableCount,
          participants: Math.max(preOdCount, odCount, actionableCount),
        },
      };
    })
    .filter(Boolean)
    .sort((a, b) =>
      String(b.endDate || "").localeCompare(String(a.endDate || ""))
    );
}

module.exports = async function (context, req) {
  try {
    const workshopId = req.query.workshopId;

    if (!workshopId) {
      const summaries = await listEndedWorkshopSummaries();
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

    // Admins can view live participant answers during the workshop so
    // Responses/Export updates as soon as participants save.
    const cached = getCachedPayload(workshopId);
    const payload =
      cached || (await buildWorkshopResponsePayload(workshop));

    if (!cached) {
      setCachedPayload(workshopId, payload);
    }

    context.res = {
      status: 200,
      body: {
        success: true,
        ...payload,
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
