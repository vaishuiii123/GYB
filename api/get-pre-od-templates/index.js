const { TableClient } = require("@azure/data-tables");

module.exports = async function (context) {
  try {
    const client = TableClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING,
      "PreODTemplate"
    );

    const templates = [];

    for await (const entity of client.listEntities()) {
      if (entity.partitionKey !== "PreODTemplate") {
        continue;
      }

      const questionSrNos = String(entity.QuestionSrNos || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      templates.push({
        id: entity.rowKey,
        templateName: entity.TemplateName || "",
        questionSrNos,
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
