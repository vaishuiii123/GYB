const { getTableClient } = require("../shared/tableHelper");
const { CACHE_KEYS, invalidate, invalidatePrefix } = require("../shared/listCache");

const { PRE_OD_QUESTIONS } = require("../shared/preOdQuestions");
const {
  normalizeCustomQuestions,
  serializeCustomQuestions,
} = require("../shared/preOdCustomQuestions");
const {
  normalizeQuestionAttachments,
  serializeQuestionAttachments,
} = require("../shared/preOdAttachments");

module.exports = async function (context, req) {
  try {
    const { workshopId, questionSrNos, customQuestions, questionAttachments, preOdTemplateId, preOdTemplateName } =
      req.body || {};

    if (!workshopId) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "Workshop is required.",
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

    const validSrNos = new Set(
      PRE_OD_QUESTIONS.map((item) => String(item.srNo))
    );
    const filteredSrNos = srNos.filter((srNo) => validSrNos.has(String(srNo)));
    const normalizedCustom = normalizeCustomQuestions(customQuestions);
    const attachmentsMap = normalizeQuestionAttachments(
      questionAttachments,
      filteredSrNos
    );

    if (filteredSrNos.length === 0 && normalizedCustom.length === 0) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message:
            "Select at least one Pre-Organizational Development question or add a custom question.",
        },
      };
      return;
    }

    const client = getTableClient("Workshop");

    let workshop;
    try {
      workshop = await client.getEntity("Workshop", workshopId);
    } catch {
      context.res = {
        status: 404,
        body: {
          success: false,
          message: "Workshop not found.",
        },
      };
      return;
    }

    const questionCount = filteredSrNos.length + normalizedCustom.length;

    await client.updateEntity(
      {
        partitionKey: "Workshop",
        rowKey: workshopId,
        PreOdQuestionSrNos: filteredSrNos.join(","),
        PreOdCustomQuestions: serializeCustomQuestions(normalizedCustom),
        PreOdQuestionAttachments: serializeQuestionAttachments(attachmentsMap),
        PreOdQuestionCount: questionCount,
        PreOdTemplateId:
          preOdTemplateId !== undefined
            ? String(preOdTemplateId || "")
            : workshop.PreOdTemplateId || "",
        PreOdTemplateName:
          preOdTemplateName !== undefined
            ? String(preOdTemplateName || "")
            : workshop.PreOdTemplateName || "",
      },
      "Merge"
    );

    invalidate(CACHE_KEYS.workshops);
    invalidatePrefix("list:workshop-by-org:");

    context.res = {
      status: 200,
      body: {
        success: true,
        message: "Pre-Organizational Development assigned to workshop successfully.",
        workshopId,
        workshopName: workshop.WorkshopName || "",
        questionSrNos: filteredSrNos,
        questionAttachments: attachmentsMap,
        customQuestions: normalizedCustom,
        questionCount,
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
