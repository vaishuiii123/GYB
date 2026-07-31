const { TableClient } = require("@azure/data-tables");
const { PRE_OD_QUESTIONS } = require("../shared/preOdQuestions");

module.exports = async function (context, req) {
  try {
    const { templateName, questionSrNos, createdBy } = req.body || {};

    if (!templateName || !String(templateName).trim()) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "Template name is required.",
        },
      };
      return;
    }

    const srNos = Array.isArray(questionSrNos)
      ? questionSrNos.map((item) => String(item).trim()).filter(Boolean)
      : String(questionSrNos || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);

    if (srNos.length === 0) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "Select at least one Pre OD question.",
        },
      };
      return;
    }

    const validSrNos = new Set(PRE_OD_QUESTIONS.map((item) => String(item.srNo)));
    const filteredSrNos = srNos.filter((srNo) => validSrNos.has(String(srNo)));

    if (filteredSrNos.length === 0) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "No valid Pre OD question numbers were selected.",
        },
      };
      return;
    }

    const client = TableClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING,
      "PreODTemplate"
    );

    try {
      await client.createTable();
    } catch (error) {
      if (!error.message?.includes("TableAlreadyExists")) {
        throw error;
      }
    }

    const templateId = Date.now().toString();

    await client.createEntity({
      partitionKey: "PreODTemplate",
      rowKey: templateId,
      TemplateName: String(templateName).trim(),
      QuestionSrNos: filteredSrNos.join(","),
      CreatedBy: createdBy || "Admin",
      CreatedDate: new Date().toISOString(),
    });

    context.res = {
      status: 201,
      body: {
        success: true,
        message: "Pre OD template created successfully.",
        template: {
          id: templateId,
          templateName: String(templateName).trim(),
          questionSrNos: filteredSrNos,
          questionCount: filteredSrNos.length,
        },
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
