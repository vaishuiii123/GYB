const { ensureTableClient } = require("../shared/tableHelper");
const {
  getWorkshopById,
  getWorkshopEditStatus,
} = require("../shared/workshopAccess");
const {
  buildWorkshopResponsePayload,
  isWorkshopEnded,
} = require("../shared/workshopResponseStore");
const { listPreOdWorkshopSummaries } = require("../shared/preOdResponseStore");

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

    if (!isWorkshopEnded(workshop)) {
      context.res = {
        status: 403,
        body: {
          success: false,
          message:
            "Workshop responses are available on the admin dashboard after the workshop ends.",
          editStatus: getWorkshopEditStatus(workshop),
        },
      };
      return;
    }

    const payload = await buildWorkshopResponsePayload(workshop);

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
