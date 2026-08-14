const { getTableClient } = require("../shared/tableHelper");


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

    await client.deleteEntity("Workshop", workshopId);

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
