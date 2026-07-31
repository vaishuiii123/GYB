const { getTableClient, escapeODataValue } = require("../shared/tableHelper");

module.exports = async function (context, req) {
  try {
    const participantId = req.query.participantId;
    const workshopId = req.query.workshopId;

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
      context.res = {
        status: 200,
        body: {
          success: true,
          table: "ActionableItem",
          data: [],
        },
      };
      return;
    }

    actionables.sort((a, b) =>
      (b.updatedDate || b.createdDate || "").localeCompare(
        a.updatedDate || a.createdDate || ""
      )
    );

    context.res = {
      status: 200,
      body: {
        success: true,
        table: "ActionableItem",
        data: actionables,
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
