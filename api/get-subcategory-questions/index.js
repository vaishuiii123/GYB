const { getTableClient } = require("../shared/tableHelper");


module.exports = async function (context, req) {
  try {

    const subCategoryId =
      req.query.subCategoryId;

    const client =
      getTableClient("QuestionnaireSubCategoryQuestions");

    const questionIds = [];

    for await (
      const entity of client.listEntities()
    ) {

      if (
        entity.SubCategoryId ===
        subCategoryId
      ) {

        questionIds.push(
          entity.QuestionId
        );
      }
    }

    context.res = {
      status: 200,
      body: {
        success: true,
        questionIds,
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
