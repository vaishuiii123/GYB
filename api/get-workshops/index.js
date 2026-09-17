const { getTableClient } = require("../shared/tableHelper");
const { readWorkshopDate } = require("../shared/workshopDates");
const { CACHE_KEYS, getOrLoad } = require("../shared/listCache");

async function loadWorkshops() {
  const client = getTableClient("Workshop");
  const workshops = [];

  // Keep list payload lean — skip large Pre-OD JSON blobs.
  const entities = client.listEntities({
    queryOptions: {
      filter: `PartitionKey eq 'Workshop'`,
      select: [
        "RowKey",
        "WorkshopName",
        "PreOdStartDate",
        "StartDate",
        "EndDate",
        "TemplateId",
        "TemplateName",
        "PreOdTemplateId",
        "PreOdTemplateName",
        "PreOdQuestionSrNos",
        "PreOdQuestionCount",
        "OrganizationId",
        "OrganizationName",
        "ParticipantCount",
        "CreatedBy",
        "CreatedDate",
      ],
    },
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
      preOdCustomQuestions: "[]",
      preOdQuestionAttachments: "{}",
      preOdQuestionCount: entity.PreOdQuestionCount || 0,
      organizationId: entity.OrganizationId,
      organizationName: entity.OrganizationName,
      participantCount: entity.ParticipantCount,
      createdBy: entity.CreatedBy,
      createdDate: entity.CreatedDate,
    });
  }

  workshops.sort(
    (a, b) =>
      new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
  );

  return workshops;
}

module.exports = async function (context, req) {
  try {
    const { value: workshops, cacheHit } = await getOrLoad(
      CACHE_KEYS.workshops,
      loadWorkshops
    );

    context.res = {
      status: 200,
      headers: {
        "Cache-Control": "private, max-age=30",
        "X-List-Cache": cacheHit ? "HIT" : "MISS",
      },
      body: {
        success: true,
        workshops,
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
