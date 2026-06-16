const {
  TableClient,
  TableServiceClient,
} = require("@azure/data-tables");

module.exports = async function (context, req) {
  try {
    const {
      templateName,
      categoryId,
      categoryName,
      questionIds,
      createdBy,
    } = req.body;

    if (
      !templateName ||
      !categoryId ||
      !questionIds ||
      questionIds.length === 0
    ) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "Required fields missing",
        },
      };
      return;
    }

    // Create table if it doesn't exist
    const serviceClient =
      TableServiceClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING
      );

    try {
      await serviceClient.createTable(
        "Template"
      );

      context.log(
        "Template table created"
      );

    } catch (err) {

      // Ignore if already exists
      context.log(
        "Template table already exists"
      );
    }

    const client =
      TableClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING,
        "Template"
      );

    const templateId =
      Date.now().toString();

    const entity = {
      partitionKey: "Template",

      rowKey: templateId,

      TemplateName:
        templateName,

      CategoryId:
        categoryId,

      CategoryName:
        categoryName || "",

      QuestionIds:
        questionIds.join(","),

      CreatedBy:
        createdBy || "",

      CreatedDate:
        new Date().toISOString(),
    };

    await client.createEntity(
      entity
    );

    context.res = {
      status: 200,
      body: {
        success: true,
        templateId,
      },
    };

  } catch (error) {

    context.log(
      "Create Template Error:",
      error
    );

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
