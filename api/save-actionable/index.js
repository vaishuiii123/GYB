const { randomUUID } = require("crypto");
const { ensureTableClient } = require("../shared/tableHelper");
const { assertWorkshopEditable } = require("../shared/workshopAccess");

module.exports = async function (context, req) {
  try {
    const {
      id,
      participantId,
      workshopId,
      organizationId,
      categoryId,
      categoryName,
      categoryPath,
      description,
      timeline,
      responsiblePersons,
      comments,
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

    if (!categoryId || !String(description || "").trim()) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "Category and Description are required.",
        },
      };
      return;
    }

    if (
      !String(timeline || "").trim() ||
      !String(responsiblePersons || "").trim()
    ) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "Timeline and Person/s responsible are required.",
        },
      };
      return;
    }

    const access = await assertWorkshopEditable({ workshopId, organizationId });
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

    const tableClient = await ensureTableClient("ActionableItem");

    const actionableId = id || randomUUID();
    const now = new Date().toISOString();
    let createdDate = now;

    if (id) {
      try {
        const existing = await tableClient.getEntity(participantId, id);
        createdDate = existing.CreatedDate || now;
      } catch {
        // treat as new if missing
      }
    }

    const entity = {
      partitionKey: participantId,
      rowKey: actionableId,
      ParticipantId: participantId,
      WorkshopId: workshopId || "",
      OrganizationId: organizationId || "",
      CategoryId: categoryId,
      CategoryName: categoryName || "",
      CategoryPath: categoryPath || "",
      Description: String(description).trim(),
      Timeline: String(timeline).trim(),
      ResponsiblePersons: String(responsiblePersons).trim(),
      Comments: String(comments || "").trim(),
      CreatedDate: createdDate,
      UpdatedDate: now,
    };

    try {
      if (id) {
        await tableClient.getEntity(participantId, id);
        await tableClient.updateEntity(entity, "Replace");
      } else {
        await tableClient.createEntity(entity);
      }
    } catch {
      await tableClient.createEntity(entity);
    }

    context.res = {
      status: 200,
      body: {
        success: true,
        message: "Actionable saved successfully.",
        table: "ActionableItem",
        data: {
          id: actionableId,
          participantId,
          workshopId: workshopId || "",
          organizationId: organizationId || "",
          categoryId,
          categoryName: categoryName || "",
          categoryPath: categoryPath || "",
          description: entity.Description,
          timeline: entity.Timeline,
          responsiblePersons: entity.ResponsiblePersons,
          comments: entity.Comments,
          createdDate,
          updatedDate: now,
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
