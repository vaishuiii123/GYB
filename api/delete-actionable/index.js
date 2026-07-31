const { getTableClient } = require("../shared/tableHelper");
const { assertWorkshopEditable } = require("../shared/workshopAccess");

module.exports = async function (context, req) {
  try {
    const participantId = req.query.participantId;
    const id = req.query.id;

    if (!participantId || !id) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "participantId and id are required.",
        },
      };
      return;
    }

    const tableClient = getTableClient("ActionableItem");

    let existing;
    try {
      existing = await tableClient.getEntity(participantId, id);
    } catch {
      context.res = {
        status: 404,
        body: {
          success: false,
          message: "Actionable not found.",
        },
      };
      return;
    }

    const access = await assertWorkshopEditable({
      workshopId: existing.WorkshopId,
      organizationId: existing.OrganizationId,
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

    await tableClient.deleteEntity(participantId, id);

    context.res = {
      status: 200,
      body: {
        success: true,
        message: "Actionable deleted successfully.",
        table: "ActionableItem",
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
