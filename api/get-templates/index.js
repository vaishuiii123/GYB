const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
  try {

    const client =
      TableClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING,
        "Template"
      );

    // Create table if not exists
    await client.createTable();

    const templates = [];

    for await (
      const entity of client.listEntities()
    ) {

      if (
        entity.partitionKey === "Template"
      ) {

        templates.push({
          id:
            entity.rowKey,

          templateName:
            entity.TemplateName || "",

          categoryId:
            entity.CategoryId || "",

          categoryName:
            entity.CategoryName || "",

          questionIds:
            entity.QuestionIds || "",

          questionCount:
            entity.QuestionIds
              ? entity.QuestionIds
                  .split(",")
                  .filter(Boolean).length
              : 0,

          createdBy:
            entity.CreatedBy || "",

          createdDate:
            entity.CreatedDate || "",
        });
      }
    }

    context.res = {
      status: 200,
      body: {
        success: true,
        templates,
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
