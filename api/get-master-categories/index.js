const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
  try {
    const client =
      TableClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING,
        "MasterCategory"
      );

    const categories = [];

    for await (const entity of client.listEntities()) {
      categories.push({
        id: entity.rowKey,
        masterCategoryName:
          entity.MasterCategoryName,
      });
    }

    context.res = {
      status: 200,
      body: {
        success: true,
        categories,
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
