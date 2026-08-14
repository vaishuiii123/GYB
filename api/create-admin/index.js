const { getTableClient } = require("../shared/tableHelper");

const { isValidEmail } = require("../shared/validation");

const ADMIN_ROLES = new Set(["admin", "organizer"]);

module.exports = async function (context, req) {
  try {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim();
    const roleRaw = String(req.body?.role || "Admin").trim();
    const role =
      roleRaw.charAt(0).toUpperCase() + roleRaw.slice(1).toLowerCase();
    const createdBy = String(req.body?.createdBy || "").trim();

    if (!name || !email) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "Name and email are required.",
        },
      };
      return;
    }

    if (!isValidEmail(email)) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "Enter a valid email address.",
        },
      };
      return;
    }

    if (!ADMIN_ROLES.has(role.toLowerCase())) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "Role must be Admin or Organizer.",
        },
      };
      return;
    }

    const client = getTableClient("User");

    const normalizedEmail = email.toLowerCase();

    for await (const entity of client.listEntities()) {
      if (
        entity.Email &&
        String(entity.Email).toLowerCase() === normalizedEmail
      ) {
        context.res = {
          status: 400,
          body: {
            success: false,
            message: "An admin with this email already exists.",
          },
        };
        return;
      }
    }

    const rowKey = Date.now().toString();

    await client.createEntity({
      partitionKey: "User",
      rowKey,
      Name: name,
      Email: email,
      Role: role === "Organizer" ? "Organizer" : "Admin",
      CreatedBy: createdBy,
      CreatedDate: new Date().toISOString(),
    });

    context.res = {
      status: 200,
      body: {
        success: true,
        message: "Admin added successfully.",
        admin: {
          id: rowKey,
          partitionKey: "User",
          name,
          email,
          role: role === "Organizer" ? "Organizer" : "Admin",
        },
      },
    };
  } catch (error) {
    context.log("Error in create-admin:", error);

    context.res = {
      status: 500,
      body: {
        success: false,
        message: error.message || "Unable to create admin.",
      },
    };
  }
};
