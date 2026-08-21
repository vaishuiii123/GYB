const { getTableClient } = require("../shared/tableHelper");

module.exports = async function (context, req) {
  try {
    const templateId = req.query.id;

    if (!templateId) {
      context.res = {
        status: 400,
        body: {
          success: false,
          error: "Template Id required",
        },
      };
      return;
    }

    const client = getTableClient("PreODTemplate");
    await client.deleteEntity("PreODTemplate", String(templateId));

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
