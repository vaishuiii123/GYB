const { TableClient } = require("@azure/data-tables");

const ADMIN_ROLES = new Set(["admin", "organizer"]);

module.exports = async function (context, req) {
  try {
    const client = TableClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING,
      "User"
    );

    const admins = [];

    for await (const entity of client.listEntities()) {
      const role = String(entity.Role || "").trim();
      if (!ADMIN_ROLES.has(role.toLowerCase())) {
        continue;
      }

      admins.push({
        id: entity.rowKey,
        partitionKey: entity.partitionKey,
        name: entity.Name || "",
        email: entity.Email || "",
        role,
        createdDate: entity.CreatedDate || "",
      });
    }

    admins.sort((a, b) =>
      String(a.name || a.email).localeCompare(String(b.name || b.email))
    );

    context.res = {
      status: 200,
      body: {
        success: true,
        admins,
      },
    };
  } catch (error) {
    context.log("Error in get-admins:", error);

    context.res = {
      status: 500,
      body: {
        success: false,
        message: error.message || "Unable to load admins.",
      },
    };
  }
};
