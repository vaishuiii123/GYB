const { getTableClient } = require("../shared/tableHelper");

module.exports = async function (context, req) {
  try {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};

    const {
      templateId,
      templateName,
      categoryId,
      categoryIds,
      categoryName,
      categoryNames,
      categoryPaths,
      questionIds,
      modifiedBy,
    } = body;

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
      !templateId ||
      !templateName ||
      resolvedCategoryIds.length === 0 ||
      !questionIds ||
      questionIds.length === 0
    ) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message:
            "Template ID, name, categories, and questions are required.",
        },
      };
      return;
    }

    const client = getTableClient("Template");

    let existing;
    try {
      existing = await client.getEntity("Template", String(templateId));
    } catch {
      context.res = {
        status: 404,
        body: {
          success: false,
          message: "Template not found.",
        },
      };
      return;
    }

    await client.updateEntity(
      {
        partitionKey: "Template",
        rowKey: String(templateId),
        TemplateName: String(templateName).trim(),
        CategoryId: resolvedCategoryIds.join(","),
        CategoryName: resolvedCategoryNames.join(","),
        CategoryPath: resolvedCategoryPaths.join("|"),
        QuestionIds: questionIds.join(","),
        CreatedBy: existing.CreatedBy || "",
        CreatedDate: existing.CreatedDate || new Date().toISOString(),
        ModifiedBy: modifiedBy || "",
        ModifiedDate: new Date().toISOString(),
      },
      "Replace"
    );

    context.res = {
      status: 200,
      body: {
        success: true,
        message: "Template updated successfully.",
        templateId: String(templateId),
      },
    };
  } catch (error) {
    context.log("Update Template Error:", error);

    context.res = {
      status: 500,
      body: {
        success: false,
        error: error.message,
      },
    };
  }
};
