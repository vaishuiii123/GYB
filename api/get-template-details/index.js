const { getTableClient } = require("../shared/tableHelper");


function parseQuestionIds(questionIdField) {
    if (!questionIdField) return [];
    return String(questionIdField)
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
}

module.exports = async function (context, req) {
    try {
        const templateId = req.query.templateId;

        if (!templateId) {
            context.res = {
                status: 400,
                body: {
                    success: false,
                    message: "templateId required"
                }
            };
            return;
        }

        const templateClient = getTableClient("Template");

        const categoryClient = getTableClient("QuestionnaireCategory");

        const parentClient = getTableClient("QuestionnaireParentCategory");

        const middleClient = getTableClient("QuestionnaireMiddleCategory");

        const topClient = getTableClient("QuestionnaireTopCategory");

        const questionClient = getTableClient("Questions");

        const optionClient = getTableClient("QuestionOptions");

        const tagClient = getTableClient("Tags");

        let template = null;

        for await (const entity of templateClient.listEntities()) {
            if (entity.rowKey === templateId) {
                template = entity;
                break;
            }
        }

        if (!template) {
            context.res = {
                status: 404,
                body: {
                    success: false,
                    message: "Template not found"
                }
            };
            return;
        }

        const tops = [];
        const middles = [];
        const parents = [];
        const categories = [];

        for await (const item of topClient.listEntities({
            queryOptions: { filter: "PartitionKey eq 'TopCategory'" }
        })) {
            tops.push(item);
        }

        for await (const item of middleClient.listEntities({
            queryOptions: { filter: "PartitionKey eq 'MiddleCategory'" }
        })) {
            middles.push(item);
        }

        for await (const item of parentClient.listEntities({
            queryOptions: { filter: "PartitionKey eq 'ParentCategory'" }
        })) {
            parents.push(item);
        }

        for await (const category of categoryClient.listEntities({
            queryOptions: { filter: "PartitionKey eq 'Category'" }
        })) {
            const parent = parents.find(
                (p) => p.rowKey === category.ParentCategoryId
            );
            const middle = parent
                ? middles.find((m) => m.rowKey === parent.MiddleCategoryId)
                : null;
            const top = middle
                ? tops.find((t) => t.rowKey === middle.TopCategoryId)
                : null;

            const topCategoryName = top?.TopCategoryName || "";
            const middleCategoryName = middle?.MiddleCategoryName || "";
            const parentCategoryName = parent?.ParentCategoryName || "";
            const categoryName = category.CategoryName || "";

            const fullPath = [
                topCategoryName,
                middleCategoryName,
                parentCategoryName,
                categoryName
            ]
                .filter(Boolean)
                .join(" > ");

            categories.push({
                id: category.rowKey,
                categoryName,
                topCategoryName,
                middleCategoryName,
                parentCategoryName,
                tagId: category.TagId || "",
                fullPath,
                questionIds: parseQuestionIds(category.QuestionId)
            });
        }

        const questionToCategory = {};
        categories.forEach((category) => {
            category.questionIds.forEach((questionId) => {
                questionToCategory[questionId] = category;
            });
        });

        const savedPaths = template.CategoryPath
            ? template.CategoryPath.split("|").filter(Boolean)
            : [];

        const questionIds = parseQuestionIds(template.QuestionIds);
        const categoryIds = parseQuestionIds(template.CategoryId);

        const allOptions = [];
        for await (const opt of optionClient.listEntities({
            queryOptions: { filter: "PartitionKey eq 'QuestionOption'" }
        })) {
            allOptions.push(opt);
        }

        const tagNameById = new Map();
        const tagColorById = new Map();
        try {
            for await (const tag of tagClient.listEntities({
                queryOptions: { filter: "PartitionKey eq 'Tag'" }
            })) {
                tagNameById.set(tag.rowKey, tag.TagName || "");
                tagColorById.set(tag.rowKey, tag.TagColor || "");
            }
        } catch {
            // Tags table may be empty
        }

        const questions = [];

        for (const questionId of questionIds) {
            try {
                const question = await questionClient.getEntity(
                    "Question",
                    questionId
                );

                const categoryInfo = questionToCategory[questionId];

                const options = allOptions
                    .filter((opt) => opt.QuestionId === questionId)
                    .map((opt) => opt.OptionText)
                    .join(", ");

                const questionTagId =
                    question.TagId ||
                    question.tagId ||
                    categoryInfo?.tagId ||
                    "";

                questions.push({
                    id: question.rowKey,
                    question: question.QuestionText,
                    answerType: question.QuestionType,
                    tagId: questionTagId,
                    tagName: questionTagId
                        ? tagNameById.get(questionTagId) || ""
                        : "",
                    tagColor: questionTagId
                        ? tagColorById.get(questionTagId) || ""
                        : "",
                    attachmentsApplicable:
                        String(question.AttachmentsApplicable || "N").toUpperCase() ===
                        "Y"
                            ? "Y"
                            : "N",
                    required: false,
                    options,
                    categoryId: categoryInfo?.id || "",
                    categoryName: categoryInfo?.categoryName || "",
                    topCategoryName: categoryInfo?.topCategoryName || "",
                    middleCategoryName: categoryInfo?.middleCategoryName || "",
                    parentCategoryName: categoryInfo?.parentCategoryName || "",
                    categoryPath: categoryInfo?.fullPath || ""
                });
            } catch {
                // question deleted, skip
            }
        }

        context.res = {
            status: 200,
            body: {
                success: true,
                template: {
                    id: template.rowKey,
                    templateName: template.TemplateName,
                    categoryId: template.CategoryId || "",
                    categoryIds,
                    categoryName: template.CategoryName,
                    categoryNames: template.CategoryName
                        ? template.CategoryName.split(",")
                              .map((name) => name.trim())
                              .filter(Boolean)
                        : [],
                    categoryPaths: savedPaths,
                    questionIds,
                    questions
                }
            }
        };
    } catch (error) {
        context.res = {
            status: 500,
            body: {
                success: false,
                error: error.message
            }
        };
    }
};
