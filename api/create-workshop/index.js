const { getTableClient } = require("../shared/tableHelper");
const { validateWorkshopDateOrder } = require("../shared/workshopDates");
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

function buildPreOdFields(body) {
  const {
    questionSrNos,
    customQuestions,
    questionAttachments,
    preOdTemplateId,
    preOdTemplateName,
  } = body || {};

  const hasPreOdPayload =
    questionSrNos !== undefined ||
    customQuestions !== undefined ||
    questionAttachments !== undefined ||
    preOdTemplateId !== undefined ||
    preOdTemplateName !== undefined;

  if (!hasPreOdPayload) {
    return null;
  }

  const srNos = Array.isArray(questionSrNos)
    ? questionSrNos.map((item) => String(item).trim()).filter(Boolean)
    : String(questionSrNos || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

  const validSrNos = new Set(PRE_OD_QUESTIONS.map((item) => String(item.srNo)));
  const filteredSrNos = srNos.filter((srNo) => validSrNos.has(String(srNo)));
  const normalizedCustom = normalizeCustomQuestions(customQuestions);
  const attachmentsMap = normalizeQuestionAttachments(
    questionAttachments,
    filteredSrNos
  );
  const questionCount = filteredSrNos.length + normalizedCustom.length;

  return {
    PreOdQuestionSrNos: filteredSrNos.join(","),
    PreOdCustomQuestions: serializeCustomQuestions(normalizedCustom),
    PreOdQuestionAttachments: serializeQuestionAttachments(attachmentsMap),
    PreOdQuestionCount: questionCount,
    PreOdTemplateId: String(preOdTemplateId || ""),
    PreOdTemplateName: String(preOdTemplateName || ""),
  };
}

module.exports = async function (context, req) {
  try {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};

    const {
      workshopName,
      preOdStartDate,
      startDate,
      endDate,
      templateId,
      templateName,
      preOdTemplateId,
      preOdTemplateName,
      organizationId,
      organizationName,
      participantCount,
      createdBy,
    } = body;

    if (!workshopName || !templateId || !organizationId) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "Required fields missing",
        },
      };
      return;
    }

    const dates = validateWorkshopDateOrder({
      preOdStartDate,
      startDate,
      endDate,
    });

    if (!dates.ok) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: dates.message,
        },
      };
      return;
    }

    const client = getTableClient("Workshop");
    const workshopId = Date.now().toString();
    const preOdFields = buildPreOdFields(body);

    await client.createEntity({
      partitionKey: "Workshop",
      rowKey: workshopId,
      WorkshopName: String(workshopName).trim(),
      PreOdStartDate: dates.preOdStartDate,
      StartDate: dates.startDate,
      EndDate: dates.endDate,
      TemplateId: templateId,
      TemplateName: templateName || "",
      PreOdTemplateId: preOdTemplateId || "",
      PreOdTemplateName: preOdTemplateName || "",
      OrganizationId: organizationId,
      OrganizationName: organizationName || "",
      ParticipantCount: Number(participantCount) || 0,
      CreatedBy: createdBy || "",
      CreatedDate: new Date().toISOString(),
      ...(preOdFields || {}),
    });

    invalidate(CACHE_KEYS.workshops);
    invalidatePrefix("list:workshop-by-org:");

    context.res = {
      status: 200,
      body: {
        success: true,
        workshopId,
        preOdStartDate: dates.preOdStartDate,
        startDate: dates.startDate,
        endDate: dates.endDate,
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
