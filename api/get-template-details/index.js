const {
    getTableClient,
    listPartition
} = require("../shared/tableHelper");
const { getOrLoad } = require("../shared/listCache");


function parseQuestionIds(questionIdField) {
    if (!questionIdField) return [];
    return String(questionIdField)
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
}

async function loadTemplateDetails(templateId) {
    const templateClient = getTableClient("Template");
    const categoryClient = getTableClient("QuestionnaireCategory");
    const parentClient = getTableClient("QuestionnaireParentCategory");
    const middleClient = getTableClient("QuestionnaireMiddleCategory");
    const topClient = getTableClient("QuestionnaireTopCategory");
    const questionClient = getTableClient("Questions");
    const optionClient = getTableClient("QuestionOptions");
    const tagClient = getTableClient("Tags");

    let template;
    try {
        template = await templateClient.getEntity("Template", templateId);
    } catch (error) {
        if (error.statusCode === 404) return null;
        throw error;
    }

    const questionIds = parseQuestionIds(template.QuestionIds);

    // These reads are independent. Running them together removes the long
    // Azure Table waterfall that previously blocked this page.
    const [
        tops,
        middles,
        parents,
        categoryEntities,
        allOptions,
        tags,
        questionEntities
    ] = await Promise.all([
        listPartition(topClient, "TopCategory"),
        listPartition(middleClient, "MiddleCategory"),
        listPartition(parentClient, "ParentCategory"),
        listPartition(categoryClient, "Category"),
        listPartition(optionClient, "QuestionOption"),
        listPartition(tagClient, "Tag").catch(() => []),
        listPartition(questionClient, "Question")
    ]);

    const topById = new Map(tops.map((item) => [item.rowKey, item]));
    const middleById = new Map(middles.map((item) => [item.rowKey, item]));
    const parentById = new Map(parents.map((item) => [item.rowKey, item]));
    const wantedQuestionIds = new Set(questionIds);
    const questionById = new Map(
        questionEntities
            .filter((item) => wantedQuestionIds.has(item.rowKey))
            .map((item) => [item.rowKey, item])
    );
    const tagById = new Map(tags.map((item) => [item.rowKey, item]));
    const optionsByQuestion = new Map();

    for (const option of allOptions) {
        if (!optionsByQuestion.has(option.QuestionId)) {
            optionsByQuestion.set(option.QuestionId, []);
        }
        optionsByQuestion.get(option.QuestionId).push(option.OptionText);
    }

    // A question can belong to several template categories, so it is listed
    // once per category rather than collapsed to a single row.
    const templateCategoryIds = new Set(parseQuestionIds(template.CategoryId));
    const questionToCategories = new Map();
    for (const category of categoryEntities) {
        if (
            templateCategoryIds.size > 0 &&
            !templateCategoryIds.has(category.rowKey)
        ) {
            continue;
        }

        const parent = parentById.get(category.ParentCategoryId);
        const middle = parent
            ? middleById.get(parent.MiddleCategoryId)
            : null;
        const top = middle ? topById.get(middle.TopCategoryId) : null;
        const info = {
            id: category.rowKey,
            categoryName: category.CategoryName || "",
            topCategoryName: top?.TopCategoryName || "",
            middleCategoryName: middle?.MiddleCategoryName || "",
            parentCategoryName: parent?.ParentCategoryName || "",
            tagId: category.TagId || ""
        };
        info.fullPath = [
            info.topCategoryName,
            info.middleCategoryName,
            info.parentCategoryName,
            info.categoryName
        ].filter(Boolean).join(" > ");

        for (const questionId of parseQuestionIds(category.QuestionId)) {
            if (!questionToCategories.has(questionId)) {
                questionToCategories.set(questionId, []);
            }
            questionToCategories.get(questionId).push(info);
        }
    }

    const questions = questionIds.flatMap((questionId) => {
        const question = questionById.get(questionId);
        if (!question) return [];

        const categoryMatches = questionToCategories.get(questionId) || [null];

        return categoryMatches.map((categoryInfo) => {
            const questionTagId =
                question.TagId || question.tagId || categoryInfo?.tagId || "";
            const tag = tagById.get(questionTagId);

            return {
                id: question.rowKey,
                question: question.QuestionText,
                answerType: question.QuestionType,
                tagId: questionTagId,
                tagName: tag?.TagName || "",
                tagColor: tag?.TagColor || "",
                attachmentsApplicable:
                    String(question.AttachmentsApplicable || "N").toUpperCase() === "Y"
                        ? "Y"
                        : "N",
                required: false,
                options: (optionsByQuestion.get(questionId) || []).join(", "),
                categoryId: categoryInfo?.id || "",
                categoryName: categoryInfo?.categoryName || "",
                topCategoryName: categoryInfo?.topCategoryName || "",
                middleCategoryName: categoryInfo?.middleCategoryName || "",
                parentCategoryName: categoryInfo?.parentCategoryName || "",
                categoryPath: categoryInfo?.fullPath || ""
            };
        });
    });

    return {
        id: template.rowKey,
        templateName: template.TemplateName,
        categoryId: template.CategoryId || "",
        categoryIds: parseQuestionIds(template.CategoryId),
        categoryName: template.CategoryName,
        categoryNames: template.CategoryName
            ? template.CategoryName.split(",").map((name) => name.trim()).filter(Boolean)
            : [],
        categoryPaths: template.CategoryPath
            ? template.CategoryPath.split("|").filter(Boolean)
            : [],
        questionIds,
        questions
    };
}

module.exports = async function (context, req) {
    const templateId = String(req.query.templateId || "").trim();

    if (!templateId) {
        context.res = {
            status: 400,
            body: { success: false, message: "templateId required" }
        };
        return;
    }

    try {
        const { value: template, cacheHit } = await getOrLoad(
            `template-details:${templateId}`,
            () => loadTemplateDetails(templateId),
            5 * 60 * 1000
        );

        context.res = template
            ? {
                status: 200,
                headers: { "X-List-Cache": cacheHit ? "HIT" : "MISS" },
                body: { success: true, template }
            }
            : {
                status: 404,
                body: { success: false, message: "Template not found" }
            };
    } catch (error) {
        context.res = {
            status: 500,
            body: { success: false, error: error.message }
        };
    }
};
