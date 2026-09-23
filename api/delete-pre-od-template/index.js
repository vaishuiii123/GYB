const { getTableClient } = require("../shared/tableHelper");
const { invalidateTemplateStructure } = require("../shared/cacheInvalidation");

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
    invalidateTemplateStructure();

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
