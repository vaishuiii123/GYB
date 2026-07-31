const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
  try {
    const email = req.body?.email;

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

    const normalizedEmail = email.toLowerCase();

    const userClient = TableClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING,
      "User"
    );

    for await (const entity of userClient.listEntities()) {
      if (
        entity.Email &&
        entity.Email.toLowerCase() === normalizedEmail
      ) {
        context.res = {
          status: 200,
          body: {
            success: true,
            user: {
              email: entity.Email,
              name: entity.Name || "",
              role: entity.Role || "Organizer",
            },
          },
        };
        return;
      }
    }

    const participantClient = TableClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING,
      "Participants"
    );

    for await (const entity of participantClient.listEntities()) {
      if (
        entity.Email &&
        entity.Email.toLowerCase() === normalizedEmail
      ) {
        context.res = {
          status: 200,
          body: {
            success: true,
            user: {
              id: entity.rowKey,
              email: entity.Email,
              firstName: entity.First_Name || "",
              lastName: entity.Last_Name || "",
              First_Name: entity.First_Name || "",
              Last_Name: entity.Last_Name || "",
              organization: entity.Organisation || "",
              Organisation: entity.Organisation || "",
              Organization: entity.Organisation || "",
              role: entity.Role || "Participant",
            },
          },
        };
        return;
      }
    }

    context.res = {
      status: 200,
      body: {
        success: false,
        message: "User not found",
      },
    };
  } catch (error) {
    context.log("Error in sso-login:", error);

    context.res = {
      status: 500,
      body: {
        success: false,
        error: error.message,
      },
    };
  }
};
