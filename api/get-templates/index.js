const { getTableClient } = require("../shared/tableHelper");


module.exports = async function (context, req) {
  try {

    const client =
      getTableClient("Template");

    const templates = [];

    for await (
      const entity of client.listEntities({
        queryOptions: {
          filter: "PartitionKey eq 'Template'",
          select: [
            "RowKey",
            "TemplateName",
            "CategoryId",
            "CategoryName",
            "CategoryPath",
            "QuestionIds",
            "CreatedBy",
            "CreatedDate",
          ],
        },
      })
    ) {

        templates.push({
          id:
            entity.rowKey,

          templateName:
            entity.TemplateName || "",

          templateType: "OD",

          categoryId:
            entity.CategoryId || "",

          categoryName:
            entity.CategoryName || "",

          categoryNames: entity.CategoryName
            ? entity.CategoryName.split(",").filter(Boolean)
            : [],

          categoryPaths: entity.CategoryPath
            ? entity.CategoryPath.split("|").filter(Boolean)
            : [],

          categoryCount: entity.CategoryId
            ? entity.CategoryId.split(",").filter(Boolean).length
            : 0,

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
