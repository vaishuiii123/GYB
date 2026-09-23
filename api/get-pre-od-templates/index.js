const { getTableClient } = require("../shared/tableHelper");
const { CACHE_KEYS, getOrLoad } = require("../shared/listCache");
const {
  normalizeQuestionAttachments,
} = require("../shared/preOdAttachments");

async function loadTemplates() {
    const client = getTableClient("PreODTemplate");
    const templates = [];

    for await (const entity of client.listEntities({
      queryOptions: {
        filter: "PartitionKey eq 'PreODTemplate'",
        select: [
          "RowKey",
          "TemplateName",
          "QuestionSrNos",
          "QuestionAttachments",
          "CreatedBy",
          "CreatedDate",
        ],
      },
    })) {
      const questionSrNos = String(entity.QuestionSrNos || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      templates.push({
        id: entity.rowKey,
        templateName: entity.TemplateName || "",
        templateType: "Pre OD",
        questionSrNos,
        questionAttachments: normalizeQuestionAttachments(
          entity.QuestionAttachments,
          questionSrNos
        ),
        questionCount: questionSrNos.length,
        createdBy: entity.CreatedBy || "",
        createdDate: entity.CreatedDate || "",
      });
    }

    templates.sort(
      (a, b) =>
        new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
    );

    return templates;
}

module.exports = async function (context) {
  try {
    const { value: templates, cacheHit } = await getOrLoad(
      CACHE_KEYS.preOdTemplates,
      loadTemplates,
      5 * 60 * 1000
    );

    context.res = {
      status: 200,
      headers: { "X-List-Cache": cacheHit ? "HIT" : "MISS" },
      body: {
        success: true,
        templates,
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
