const {
  TableClient,
  TableServiceClient,
} = require("@azure/data-tables");

module.exports = async function (context, req) {
  try {
    const {
      templateName,
      categoryId,
      categoryIds,
      categoryName,
      categoryNames,
      categoryPaths,
      questionIds,
      createdBy,
    } = req.body;

    const resolvedCategoryIds = categoryIds?.length
      ? categoryIds
      : categoryId
      ? [categoryId]
      : [];

    const resolvedCategoryNames = categoryNames?.length
      ? categoryNames
      : categoryName
      ? [categoryName]
      : [];

    const resolvedCategoryPaths = categoryPaths?.length ? categoryPaths : [];

    if (
      !templateName ||
      resolvedCategoryIds.length === 0 ||
      !questionIds ||
      questionIds.length === 0
    ) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "Template name, categories, and questions are required.",
        },
      };
      return;
    }

    const serviceClient = TableServiceClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING
    );

    try {
      await serviceClient.createTable("Template");
    } catch {
      // table already exists
    }

    const client = TableClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING,
      "Template"
    );

    const templateId = Date.now().toString();

    const entity = {
      partitionKey: "Template",
      rowKey: templateId,
      TemplateName: templateName,
      CategoryId: resolvedCategoryIds.join(","),
      CategoryName: resolvedCategoryNames.join(","),
      CategoryPath: resolvedCategoryPaths.join("|"),
      QuestionIds: questionIds.join(","),
      CreatedBy: createdBy || "",
      CreatedDate: new Date().toISOString(),
    };

    await client.createEntity(entity);

    context.res = {
      status: 200,
      body: {
        success: true,
        templateId,
      },
    };
  } catch (error) {
    context.log("Create Template Error:", error);

    context.res = {
      status: 500,
      body: {
        success: false,
        error: error.message,
      },
    };
  }
};
