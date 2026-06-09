const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {

  try {

    const {
      subCategoryId,
      questionIds,
      createdBy,
    } = req.body;

    const client =
      TableClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING,
        "QuestionnaireSubCategoryQuestions"
      );

    const existing = [];

    for await (
      const entity of client.listEntities()
    ) {

      if (
        entity.SubCategoryId ===
        subCategoryId
      ) {

        existing.push(entity);
      }
    }

    // Delete old mappings

    for (const item of existing) {

      await client.deleteEntity(
        item.partitionKey,
        item.rowKey
      );
    }

    // Insert new mappings

    for (const questionId of questionIds) {

      await client.createEntity({
        partitionKey: "Mapping",

        rowKey:
          `${Date.now()}-${Math.random()}`,

        SubCategoryId:
          subCategoryId,

        QuestionId:
          questionId,

        Created_By:
          createdBy || "",
      });
    }

    context.res = {
      status: 200,
      body: {
        success: true,
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
