const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
  try {
    const createdBy = req.query.createdBy;

    const client = TableClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING,
      "Workshop"
    );

    const workshops = [];

    const entities = client.listEntities({
      queryOptions: {
        filter: `PartitionKey eq 'Workshop'`
      }
    });

    for await (const entity of entities) {
      if (
        createdBy &&
        entity.CreatedBy &&
        entity.CreatedBy.toLowerCase() !== String(createdBy).toLowerCase()
      ) {
        continue;
      }

      workshops.push({
        id: entity.rowKey,
        workshopName: entity.WorkshopName,
        startDate: entity.StartDate,
        endDate: entity.EndDate,
        templateId: entity.TemplateId,
        templateName: entity.TemplateName,
        preOdTemplateId: entity.PreOdTemplateId || "",
        preOdTemplateName: entity.PreOdTemplateName || "",
        preOdQuestionSrNos: entity.PreOdQuestionSrNos || "",
        preOdQuestionCount: entity.PreOdQuestionCount || 0,
        organizationId: entity.OrganizationId,
        organizationName: entity.OrganizationName,
        participantCount: entity.ParticipantCount,
        createdBy: entity.CreatedBy,
        createdDate: entity.CreatedDate
      });
    }

    // Optional: newest workshops first
    workshops.sort(
      (a, b) =>
        new Date(b.createdDate).getTime() -
        new Date(a.createdDate).getTime()
    );

    context.res = {
      status: 200,
      body: {
        success: true,
        workshops
      }
    };
  } catch (error) {
    context.log(error);

    context.res = {
      status: 500,
      body: {
        success: false,
        error: error.message
      }
    };
  }
};
