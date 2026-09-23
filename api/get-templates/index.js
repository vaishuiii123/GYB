const { getTableClient } = require("../shared/tableHelper");
const { CACHE_KEYS, getOrLoad } = require("../shared/listCache");

async function loadTemplates() {
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

      const templateName = entity.TemplateName || "";
      // Pre OD rows sometimes land in Template table; keep them out of OD picker.
      if (/pre\s*od/i.test(templateName)) {
        continue;
      }

        templates.push({
          id:
            entity.rowKey,

          templateName,

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

    return templates;
}

module.exports = async function (context, req) {
  try {
    const { value: templates, cacheHit } = await getOrLoad(
      CACHE_KEYS.templates,
      loadTemplates,
      5 * 60 * 1000
    );

    context.res = {
      status: 200,
      headers: { "X-List-Cache": cacheHit ? "HIT" : "MISS" },
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
