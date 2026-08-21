const { getTableClient } = require("../shared/tableHelper");
const { PRE_OD_QUESTIONS } = require("../shared/preOdQuestions");
const {
  normalizeQuestionAttachments,
  getAttachmentFlag,
} = require("../shared/preOdAttachments");

module.exports = async function (context, req) {
  try {
    const templateId = String(
      req.query.templateId || req.query.id || ""
    ).trim();

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

    const client = getTableClient("PreODTemplate");
    let entity;

    try {
      entity = await client.getEntity("PreODTemplate", templateId);
    } catch (error) {
      if (error.statusCode === 404) {
        context.res = {
          status: 404,
          body: {
            success: false,
            message: "Pre OD template not found.",
          },
        };
        return;
      }
      throw error;
    }

    const questionSrNos = String(entity.QuestionSrNos || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const questionAttachments = normalizeQuestionAttachments(
      entity.QuestionAttachments,
      questionSrNos
    );

    const bankBySrNo = new Map(
      PRE_OD_QUESTIONS.map((item) => [String(item.srNo), item])
    );

    const questions = questionSrNos
      .map((srNo) => {
        const matched = bankBySrNo.get(String(srNo));
        if (!matched) {
          return null;
        }
        return {
          srNo: matched.srNo,
          question: matched.question,
          category: matched.category,
          section: matched.section || (matched.srNo <= 33 ? "A" : "B"),
          answerType: "Text",
          attachmentsApplicable: getAttachmentFlag(questionAttachments, srNo),
        };
      })
      .filter(Boolean);

    context.res = {
      status: 200,
      body: {
        success: true,
        template: {
          id: entity.rowKey,
          templateName: entity.TemplateName || "",
          templateType: "Pre OD",
          questionSrNos,
          questionAttachments,
          questionCount: questions.length,
          createdBy: entity.CreatedBy || "",
          createdDate: entity.CreatedDate || "",
          questions,
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
