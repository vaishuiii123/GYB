const { getTableClient, escapeODataValue } = require("../shared/tableHelper");
const { getOrLoad } = require("../shared/listCache");

function actionablesCacheKey(participantId, workshopId) {
  return `list:actionables:${participantId || ""}:${workshopId || ""}`;
}

async function loadActionables(participantId, workshopId) {
  const tableClient = getTableClient("ActionableItem");
  const actionables = [];
  const filter = workshopId
    ? `PartitionKey eq '${escapeODataValue(
        participantId
      )}' and WorkshopId eq '${escapeODataValue(workshopId)}'`
    : `PartitionKey eq '${escapeODataValue(participantId)}'`;

  try {
    for await (const entity of tableClient.listEntities({
      queryOptions: { filter },
    })) {
      actionables.push({
        id: entity.rowKey,
        participantId: entity.ParticipantId || participantId,
        workshopId: entity.WorkshopId || "",
        organizationId: entity.OrganizationId || "",
        categoryId: entity.CategoryId || "",
        categoryName: entity.CategoryName || "",
        categoryPath: entity.CategoryPath || "",
        description: entity.Description || "",
        timeline: entity.Timeline || "",
        responsiblePersons: entity.ResponsiblePersons || "",
        comments: entity.Comments || "",
        createdDate: entity.CreatedDate || "",
        updatedDate: entity.UpdatedDate || "",
      });
    }
  } catch {
    return [];
  }

  actionables.sort((a, b) =>
    (b.updatedDate || b.createdDate || "").localeCompare(
      a.updatedDate || a.createdDate || ""
    )
  );

  return actionables;
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

    const { value: data, cacheHit } = await getOrLoad(
      actionablesCacheKey(participantId, workshopId),
      () => loadActionables(participantId, workshopId),
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
        table: "ActionableItem",
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
