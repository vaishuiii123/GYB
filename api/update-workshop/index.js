const { TableClient } = require("@azure/data-tables");
const { parseWorkshopStartMs } = require("../shared/workshopAccess");
const { validateWorkshopDateOrder } = require("../shared/workshopDates");

module.exports = async function (context, req) {
  try {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};

    const {
      workshopId,
      workshopName,
      preOdStartDate,
      startDate,
      endDate,
      templateId,
      templateName,
      organizationId,
      organizationName,
      participantCount,
    } = body;

    if (!workshopId || !workshopName || !templateId || !organizationId) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "Required fields missing.",
        },
      };
      return;
    }

    const dates = validateWorkshopDateOrder({
      preOdStartDate,
      startDate,
      endDate,
    });

    if (!dates.ok) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: dates.message,
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
        PreOdStartDate: dates.preOdStartDate,
        StartDate: dates.startDate,
        EndDate: dates.endDate,
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
        preOdStartDate: dates.preOdStartDate,
        startDate: dates.startDate,
        endDate: dates.endDate,
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
