const { TableClient } = require("@azure/data-tables");
const { parseWorkshopStartMs } = require("../shared/workshopAccess");

module.exports = async function (context, req) {
  try {
    const {
      workshopId,
      workshopName,
      startDate,
      endDate,
      templateId,
      templateName,
      organizationId,
      organizationName,
      participantCount,
    } = req.body || {};

    if (
      !workshopId ||
      !workshopName ||
      !startDate ||
      !endDate ||
      !templateId ||
      !organizationId
    ) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "Required fields missing.",
        },
      };
      return;
    }

    const client = TableClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING,
      "Workshop"
    );

    let workshop;
    try {
      workshop = await client.getEntity("Workshop", workshopId);
    } catch {
      context.res = {
        status: 404,
        body: {
          success: false,
          message: "Workshop not found.",
        },
      };
      return;
    }

    const startMs = parseWorkshopStartMs(workshop.StartDate);
    if (startMs !== null && Date.now() >= startMs) {
      context.res = {
        status: 403,
        body: {
          success: false,
          message: "This workshop has started and can no longer be edited.",
        },
      };
      return;
    }

    await client.updateEntity(
      {
        partitionKey: "Workshop",
        rowKey: workshopId,
        WorkshopName: String(workshopName).trim(),
        StartDate: startDate,
        EndDate: endDate,
        TemplateId: templateId,
        TemplateName: templateName || "",
        OrganizationId: organizationId,
        OrganizationName: organizationName || "",
        ParticipantCount: participantCount || 0,
      },
      "Merge"
    );

    context.res = {
      status: 200,
      body: {
        success: true,
        message: "Workshop updated successfully.",
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
