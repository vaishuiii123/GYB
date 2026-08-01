const { PRE_OD_QUESTIONS } = require("../shared/preOdQuestions");
const {
  getWorkshopById,
  getWorkshopForOrganization,
} = require("../shared/workshopAccess");
const { getPreOdFillStatus } = require("../shared/preOdAccess");
const { getPreOdResponse } = require("../shared/preOdResponseStore");
const { parseCustomQuestions } = require("../shared/preOdCustomQuestions");

function parseSrNos(value) {
  if (!value) {
    return [];
  }

  return String(value)
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => !Number.isNaN(item));
}

function personalizeQuestion(text, organizationName) {
  const company = organizationName || "your company";
  return String(text || "")
    .replace(/<<Company's>>/g, `${company}'s`)
    .replace(/KNAV/g, company);
}

module.exports = async function (context, req) {
  try {
    const participantId = req.query.participantId;
    const workshopId = req.query.workshopId;
    const organizationId = req.query.organizationId;

    let workshop = null;

    if (workshopId) {
      workshop = await getWorkshopById(workshopId);
    }

    if (!workshop && organizationId) {
      workshop = await getWorkshopForOrganization(organizationId);
    }

    if (!workshop) {
      context.res = {
        status: 404,
        body: {
          success: false,
          message: "Workshop not found.",
        },
      };
      return;
    }

    const fillStatus = getPreOdFillStatus(workshop);
    const assignedSrNos = parseSrNos(workshop.preOdQuestionSrNos);
    const questionMap = new Map(
      PRE_OD_QUESTIONS.map((item) => [item.srNo, item])
    );

    const bankQuestions = assignedSrNos
      .map((srNo) => questionMap.get(srNo))
      .filter(Boolean)
      .map((item) => ({
        srNo: item.srNo,
        category: item.category,
        question: personalizeQuestion(
          item.question,
          workshop.organizationName
        ),
        section: item.srNo <= 33 ? "A" : "B",
      }));

    const customQuestions = parseCustomQuestions(
      workshop.preOdCustomQuestions
    ).map((item) => ({
      srNo: item.srNo,
      category: item.category,
      question: personalizeQuestion(item.question, workshop.organizationName),
      section: "B",
    }));

    const questions = [...bankQuestions, ...customQuestions];

    let answers = {};
    let submittedDate = "";

    if (participantId) {
      const saved = await getPreOdResponse(workshop.id, participantId);

      if (saved) {
        answers = saved.answers || {};
        submittedDate = saved.submittedDate || "";
      }
    }
    context.res = {
      status: 200,
      body: {
        success: true,
        workshop: {
          id: workshop.id,
          workshopName: workshop.workshopName,
          organizationName: workshop.organizationName,
          startDate: workshop.startDate,
          endDate: workshop.endDate,
          preOdQuestionCount: workshop.preOdQuestionCount || questions.length,
        },
        available: fillStatus.available,
        canFill: fillStatus.canFill,
        message: fillStatus.message,
        questions,
        answers,
        submittedDate,
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
