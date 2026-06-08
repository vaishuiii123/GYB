const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
  try {
    const { masterCategoryName, createdBy } = req.body;

    const client =
      TableClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING,
        "Questionnairemastercategory"
      );

    await client.createEntity({
      partitionKey: "MasterCategory",
      rowKey: Date.now().toString(),
      MasterCategoryName: masterCategoryName,
      Created_By: createdBy,
    });

    context.res = {
      status: 200,
      body: {
        success: true,
      },
    };
  } catch (error) {
    context.res = {
      status: 500,
      body: {
        success: false,
        error: error.message,
      },
    };
  }
};
