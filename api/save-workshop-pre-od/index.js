const { getTableClient } = require("../shared/tableHelper");

const { PRE_OD_QUESTIONS } = require("../shared/preOdQuestions");
const { canEditPreOd } = require("../shared/workshopAccess");
const {
  normalizeCustomQuestions,
  serializeCustomQuestions,
} = require("../shared/preOdCustomQuestions");

module.exports = async function (context, req) {
  try {
    const { workshopId, questionSrNos, customQuestions } = req.body || {};

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

    if (filteredSrNos.length === 0 && normalizedCustom.length === 0) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "Select at least one Pre OD question or add a custom question.",
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

    if (!canEditPreOd({ startDate: workshop.StartDate })) {
      context.res = {
        status: 403,
        body: {
          success: false,
          message:
            "This workshop has started. Pre OD can no longer be created or edited.",
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
        PreOdQuestionCount: questionCount,
        PreOdTemplateId: "",
        PreOdTemplateName: "",
      },
      "Merge"
    );

    context.res = {
      status: 200,
      body: {
        success: true,
        message: "Pre OD assigned to workshop successfully.",
        workshopId,
        workshopName: workshop.WorkshopName || "",
        questionSrNos: filteredSrNos,
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
