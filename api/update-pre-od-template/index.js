const { getTableClient } = require("../shared/tableHelper");
const { invalidateTemplateStructure } = require("../shared/cacheInvalidation");
const { PRE_OD_QUESTIONS } = require("../shared/preOdQuestions");
const {
  normalizeQuestionAttachments,
  serializeQuestionAttachments,
} = require("../shared/preOdAttachments");

module.exports = async function (context, req) {
  try {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};

    const {
      templateId,
      templateName,
      questionSrNos,
      questionAttachments,
      modifiedBy,
    } = body;

    if (!templateId) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "Template ID is required.",
        },
      };
      return;
    }

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
          message: "Select at least one Pre-Organizational Development question.",
        },
      };
      return;
    }

    const validSrNos = new Set(
      PRE_OD_QUESTIONS.map((item) => String(item.srNo))
    );
    const filteredSrNos = srNos.filter((srNo) => validSrNos.has(String(srNo)));

    if (filteredSrNos.length === 0) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "No valid Pre-Organizational Development question numbers were selected.",
        },
      };
      return;
    }

    const attachmentsMap = normalizeQuestionAttachments(
      questionAttachments,
      filteredSrNos
    );

    const client = getTableClient("PreODTemplate");

    let existing;
    try {
      existing = await client.getEntity("PreODTemplate", String(templateId));
    } catch {
      context.res = {
        status: 404,
        body: {
          success: false,
          message: "Pre-Organizational Development template not found.",
        },
      };
      return;
    }

    await client.updateEntity(
      {
        partitionKey: "PreODTemplate",
        rowKey: String(templateId),
        TemplateName: String(templateName).trim(),
        QuestionSrNos: filteredSrNos.join(","),
        QuestionAttachments: serializeQuestionAttachments(attachmentsMap),
        CreatedBy: existing.CreatedBy || "Admin",
        CreatedDate: existing.CreatedDate || new Date().toISOString(),
        ModifiedBy: modifiedBy || "Admin",
        ModifiedDate: new Date().toISOString(),
      },
      "Replace"
    );
    invalidateTemplateStructure();

    context.res = {
      status: 200,
      body: {
        success: true,
        message: "Pre-Organizational Development template updated successfully.",
        template: {
          id: String(templateId),
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
