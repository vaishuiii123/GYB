const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
  try {

    const {
      id,
      masterCategoryName
    } = req.body;

    if (!id || !masterCategoryName) {

      context.res = {
        status: 400,
        body: {
          success: false,
          message: "Required fields missing"
        }
      };

      return;
    }

    const client =
      TableClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING,
        "Questionnairemastercategory"
      );

    const entity =
      await client.getEntity(
        "MasterCategory",
        id
      );

    entity.MasterCategoryName =
      masterCategoryName;

    await client.updateEntity(
      entity,
      "Replace"
    );

    context.res = {
      status: 200,
      body: {
        success: true
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
