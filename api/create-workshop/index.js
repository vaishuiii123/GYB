const { getTableClient } = require("../shared/tableHelper");

const { validateWorkshopDateOrder } = require("../shared/workshopDates");

module.exports = async function (context, req) {
  try {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};

    const {
      workshopName,
      preOdStartDate,
      startDate,
      endDate,
      templateId,
      templateName,
      preOdTemplateId,
      preOdTemplateName,
      organizationId,
      organizationName,
      participantCount,
      createdBy,
    } = body;

    if (!workshopName || !templateId || !organizationId) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "Required fields missing",
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

    const client = getTableClient("Workshop");

    try {
      await client.createTable();
    } catch (error) {
      if (!error.message?.includes("TableAlreadyExists")) {
        throw error;
      }
    }

    const workshopId = Date.now().toString();

    await client.createEntity({
      partitionKey: "Workshop",
      rowKey: workshopId,
      WorkshopName: String(workshopName).trim(),
      PreOdStartDate: dates.preOdStartDate,
      StartDate: dates.startDate,
      EndDate: dates.endDate,
      TemplateId: templateId,
      TemplateName: templateName || "",
      PreOdTemplateId: preOdTemplateId || "",
      PreOdTemplateName: preOdTemplateName || "",
      OrganizationId: organizationId,
      OrganizationName: organizationName || "",
      ParticipantCount: participantCount || 0,
      CreatedBy: createdBy || "",
      CreatedDate: new Date().toISOString(),
    });

    context.res = {
      status: 200,
      body: {
        success: true,
        workshopId,
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
        error: error.message,
      },
    };
  }
};
