const { getPreOdQuestions, PRE_OD_CATEGORIES } = require("../shared/preOdQuestions");

module.exports = async function (context) {
  try {
    const questions = getPreOdQuestions();

    context.res = {
      status: 200,
      body: {
        success: true,
        total: questions.length,
        categories: Object.values(PRE_OD_CATEGORIES),
        questions,
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
