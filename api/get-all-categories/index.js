const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
  try {

    const categoryClient =
      TableClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING,
        "QuestionnaireCategory"
      );

    const subCategoryClient =
      TableClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING,
        "Questionnairesubcategory"
      );

    const mappingClient =
      TableClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING,
        "QuestionnaireSubCategoryQuestions"
      );

    const questionClient =
      TableClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING,
        "QuestionnaireQuestions"
      );

    const categories = [];

    const subCategories = [];
    const mappings = [];
    const questions = [];

    // Load Sub Categories
    for await (const item of subCategoryClient.listEntities()) {
      subCategories.push(item);
    }

    // Load Question Mappings
    for await (const item of mappingClient.listEntities()) {
      mappings.push(item);
    }

    // Load Questions
    for await (const item of questionClient.listEntities()) {
      questions.push(item);
    }

    // Load Categories
    for await (const category of categoryClient.listEntities()) {

      if (category.partitionKey !== "Category") {
        continue;
      }

      // Find subcategories under category
      const categorySubCategories =
        subCategories.filter(
          (s) =>
            String(s.CategoryId) ===
            String(category.rowKey)
        );

      const subCategoryIds =
        categorySubCategories.map(
          (s) => String(s.rowKey)
        );

      // Find mappings
      const categoryMappings =
        mappings.filter(
          (m) =>
            subCategoryIds.includes(
              String(m.SubCategoryId)
            )
        );

      const questionIds =
        categoryMappings.map(
          (m) => String(m.QuestionId)
        );

      // Find actual questions
      const categoryQuestions =
        questions
          .filter((q) =>
            questionIds.includes(
              String(q.rowKey)
            )
          )
          .map((q) => ({
            id: q.rowKey,
            question:
              q.Question || "",
            answerType:
              q.AnswerType || "",
            options:
              q.Options || "",
            required:
              q.Required || false,
            weightage:
              q.Weightage || 0,
            color:
              q.Color || "#2563eb",
          }));

      categories.push({
        id: category.rowKey,
        categoryName:
          category.CategoryName || "",
        masterCategoryId:
          category.MasterCategoryId || "",
        createdBy:
          category.Created_By || "",
        questions:
          categoryQuestions,
      });
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
        error: error.message,
      },
    };
  }
};
