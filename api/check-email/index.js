const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
  try {
    context.log("========== CHECK EMAIL START ==========");

    context.log("Node version:", process.version);

    context.log(
      "Storage connection exists:",
      !!process.env.AZURE_STORAGE_CONNECTION_STRING
    );

    context.log(
      "Request body:",
      JSON.stringify(req.body)
    );

    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();

    if (!email) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "Email is required",
        },
      };
      return;
    }

    context.log("Email:", email);

    const connectionString =
      process.env.AZURE_STORAGE_CONNECTION_STRING;

    if (!connectionString) {
      throw new Error(
        "AZURE_STORAGE_CONNECTION_STRING is missing"
      );
    }

    context.log("Creating TableClient...");

    const client = TableClient.fromConnectionString(
      connectionString,
      "User"
    );

    context.log("TableClient created successfully");

    let found = false;
    let role = "";
    let name = "";

    context.log("Starting table query...");

    for await (const entity of client.listEntities()) {
      if (
        entity.Email &&
        String(entity.Email).trim().toLowerCase() === email
      ) {
        found = true;
        role = entity.Role || "";
        name = entity.Name || "";

        context.log("Matching user found");
        break;
      }
    }

    context.log(
      "Search completed. Found:",
      found
    );

    context.res = {
      status: 200,
      body: {
        success: true,
        found,
        role,
        name,
      },
    };
  } catch (error) {
    context.log("========== CHECK EMAIL ERROR ==========");
    context.log(error);
    context.log(error.stack);

    context.res = {
      status: 500,
      body: {
        success: false,
        message: "Unable to validate email.",
        error: error.message,
      },
    };
  }
};
