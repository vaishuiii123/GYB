const { getTableClient } = require("../shared/tableHelper");

const { readWorkshopDate } = require("../shared/workshopDates");

module.exports = async function (context, req) {
  try {
    // Shared admin view: return all workshops (no creator filter).
    const client = getTableClient("Workshop");

    const workshops = [];

    const entities = client.listEntities({
      queryOptions: {
        filter: `PartitionKey eq 'Workshop'`
      }
    });

    for await (const entity of entities) {
      workshops.push({
        id: entity.rowKey,
        workshopName: entity.WorkshopName,
        preOdStartDate: readWorkshopDate(
          entity.PreOdStartDate || entity.preOdStartDate
        ),
        startDate: readWorkshopDate(entity.StartDate || entity.startDate),
        endDate: readWorkshopDate(entity.EndDate || entity.endDate),
        templateId: entity.TemplateId,
        templateName: entity.TemplateName,
        preOdTemplateId: entity.PreOdTemplateId || "",
        preOdTemplateName: entity.PreOdTemplateName || "",
        preOdQuestionSrNos: entity.PreOdQuestionSrNos || "",
        preOdCustomQuestions: entity.PreOdCustomQuestions || "[]",
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
