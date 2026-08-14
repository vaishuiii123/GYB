const { getTableClient } = require("../shared/tableHelper");


module.exports = async function (context, req) {
  try {
    const id = String(req.body?.id || "").trim();
    const partitionKey = String(req.body?.partitionKey || "User").trim();
    const requesterEmail = String(req.body?.requesterEmail || "")
      .trim()
      .toLowerCase();

    if (!id) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "Admin id is required.",
        },
      };
      return;
    }

    const client = getTableClient("User");

    let entity;
    try {
      entity = await client.getEntity(partitionKey, id);
    } catch {
      context.res = {
        status: 404,
        body: {
          success: false,
          message: "Admin not found.",
        },
      };
      return;
    }

    if (
      requesterEmail &&
      entity.Email &&
      String(entity.Email).toLowerCase() === requesterEmail
    ) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "You cannot remove your own admin access.",
        },
      };
      return;
    }

    await client.deleteEntity(partitionKey, id);

    context.res = {
      status: 200,
      body: {
        success: true,
        message: "Admin removed successfully.",
      },
    };
  } catch (error) {
    context.log("Error in delete-admin:", error);

    context.res = {
      status: 500,
      body: {
        success: false,
        message: error.message || "Unable to delete admin.",
      },
    };
  }
};
