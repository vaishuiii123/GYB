const { getTableClient } = require("../shared/tableHelper");

module.exports = async function (context, req) {
  try {
    context.log("========== CHECK EMAIL START ==========");

    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();

    context.log("Email received:", email);

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

    const connectionString =
      process.env.AZURE_STORAGE_CONNECTION_STRING;

    context.log(
      "Storage connection exists:",
      !!connectionString
    );

    if (!connectionString) {
      context.res = {
        status: 500,
        body: {
          success: false,
          message: "Storage connection string is missing",
        },
      };
      return;
    }

    const client = getTableClient("User");

    context.log("User TableClient created");

    let found = false;
    let role = "";
    let name = "";

    // Select only needed columns; compare email in code (case-insensitive).
    const entities = client.listEntities({
      queryOptions: {
        select: ["Email", "Role", "Name"],
      },
    });

    for await (const entity of entities) {
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

    context.log("Search completed:", {
      found,
      role,
      name,
    });

    context.res = {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
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
      headers: {
        "Content-Type": "application/json",
      },
      body: {
        success: false,
        message: "Unable to validate email.",
        error: error.message,
      },
    };
  }
};
