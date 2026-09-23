const { getTableClient } = require("../shared/tableHelper");
const { CACHE_KEYS, invalidate, invalidatePrefix } = require("../shared/listCache");

module.exports = async function (context, req) {
  try {
    const { workshopId } = req.body || {};

    if (!workshopId) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "Workshop id is required.",
        },
      };
      return;
    }

    const client = getTableClient("Workshop");

    try {
      await client.deleteEntity("Workshop", workshopId);
    } catch (error) {
      if (error.statusCode === 404) {
        invalidate(CACHE_KEYS.workshops);
        invalidatePrefix("list:workshop-by-org:");
        context.res = {
          status: 200,
          body: {
            success: true,
            message: "Workshop was already deleted.",
          },
        };
        return;
      }
      throw error;
    }

    invalidate(CACHE_KEYS.workshops);
    invalidatePrefix("list:workshop-by-org:");

    context.res = {
      status: 200,
      body: {
        success: true,
        message: "Workshop deleted successfully.",
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
