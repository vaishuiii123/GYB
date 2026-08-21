const { getTableClient } = require("../shared/tableHelper");
const {
  normalizeQuestionAttachments,
} = require("../shared/preOdAttachments");

module.exports = async function (context) {
  try {
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

    context.res = {
      status: 200,
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
