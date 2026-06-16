const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {

  try {

    const categoryClient =
      TableClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING,
        "QuestionnaireCategory"
      );

    const questionClient =
      TableClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING,
        "QuestionnaireQuestions"
      );

    const categories = [];

    // Load Categories
    for await (
      const category of categoryClient.listEntities()
    ) {

      if (
        category.partitionKey ===
        "Category"
      ) {

        const questions = [];

        // Load Questions for this category
        for await (
          const question of questionClient.listEntities()
        ) {

          if (
            question.CategoryId ===
            category.rowKey
          ) {

            questions.push({
              id:
                question.rowKey,

              question:
                question.Question || "",

              answerType:
                question.AnswerType || "",

              options:
                question.Options || "",

              required:
                question.Required || false,

              weightage:
                question.Weightage || 0,

              color:
                question.Color || "#2563eb",
            });
          }
        }

        categories.push({
          id:
            category.rowKey,

          categoryName:
            category.CategoryName || "",

          masterCategoryId:
            category.MasterCategoryId || "",

          createdBy:
            category.Created_By || "",

          questions,
        });
      }
    }

    context.res = {
      status: 200,
      body: {
        success: true,
        categories,
      },
    };

  } catch (error) {

    context.log(error);

    context.res = {
      status: 500,
      body: {
        success: false,
        error:
          error.message,
      },
    };
  }
};
