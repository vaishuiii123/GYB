const { getTableClient } = require("../shared/tableHelper");
const {
    CACHE_KEYS,
    getOrLoad,
} = require("../shared/listCache");


/**
 * All question options in one scan, grouped by question id.
 * Avoids a per-question round trip when listing questions.
 */
async function loadOptionsByQuestion() {

    const optionsByQuestion = new Map();

    const entities = getTableClient("QuestionOptions").listEntities({

        queryOptions: {
            filter: "PartitionKey eq 'QuestionOption'",
            select: ["RowKey", "QuestionId", "OptionText"],
        }

    });

    for await (const entity of entities) {

        const questionId = entity.QuestionId;

        if (!questionId) {
            continue;
        }

        const options = optionsByQuestion.get(questionId) || [];

        options.push({
            id: entity.rowKey,
            questionId,
            optionText: entity.OptionText,
        });

        optionsByQuestion.set(questionId, options);

    }

    // Option ids are sequential (OPT001...), so this keeps entry order
    for (const options of optionsByQuestion.values()) {
        options.sort((a, b) => String(a.id).localeCompare(String(b.id)));
    }

    return optionsByQuestion;

}


async function loadQuestions() {
        const tableClient =
            getTableClient("Questions");



        const questions = [];



        const entities =
            tableClient.listEntities({

                queryOptions: {
                    filter: "PartitionKey eq 'Question'",
                    select: [
                        "RowKey",
                        "QuestionText",
                        "QuestionType",
                        "TagId",
                        "AttachmentsApplicable",
                        "CreatedBy",
                        "CreatedDate",
                        "ModifiedBy",
                        "ModifiedDate",
                    ],
                }

            });


        const optionsByQuestion = await loadOptionsByQuestion();


        for await (const entity of entities) {


            questions.push({

                id: entity.rowKey,

                options: optionsByQuestion.get(entity.rowKey) || [],

                questionText: entity.QuestionText,

                questionType: entity.QuestionType,

                tagId: entity.TagId,

                attachmentsApplicable:
                    String(entity.AttachmentsApplicable || "N").toUpperCase() ===
                    "Y"
                        ? "Y"
                        : "N",

                createdBy: entity.CreatedBy,

                createdDate: entity.CreatedDate,

                modifiedBy: entity.ModifiedBy,

                modifiedDate: entity.ModifiedDate

            });


        }




        questions.sort((a, b) =>
            String(a.questionText || "").localeCompare(
                String(b.questionText || "")
            )
        );

        return questions;
}

module.exports = async function (context, req) {
    try {
        const { value: questions, cacheHit } = await getOrLoad(
            CACHE_KEYS.questions,
            loadQuestions
        );

        context.res = {
            status: 200,
            headers: {
                "X-List-Cache": cacheHit ? "HIT" : "MISS",
            },
            body: {
                success: true,
                data: questions,
            },
        };
    } catch (error) {
        context.log(error);
        context.res = {
            status: 500,
            body: {
                success: false,
                message: error.message,
            },
        };
    }
};