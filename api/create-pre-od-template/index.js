const { getTableClient } = require("../shared/tableHelper");
const { PRE_OD_QUESTIONS } = require("../shared/preOdQuestions");
const {
  normalizeQuestionAttachments,
  serializeQuestionAttachments,
} = require("../shared/preOdAttachments");

module.exports = async function (context, req) {
  try {
    const { templateName, questionSrNos, questionAttachments, createdBy } =
      req.body || {};

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

    const attachmentsMap = normalizeQuestionAttachments(
      questionAttachments,
      filteredSrNos
    );

    const client = getTableClient("PreODTemplate");

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
      QuestionAttachments: serializeQuestionAttachments(attachmentsMap),
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
          templateType: "Pre OD",
          questionSrNos: filteredSrNos,
          questionAttachments: attachmentsMap,
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
