
const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
  try {
    const email = req.body.email;

    const client = TableClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING,
      "AdminMailID"
    );

    let isAdmin = false;

    for await (const entity of client.listEntities()) {
      if (
        entity.Email &&
        entity.Email.toLowerCase() === email.toLowerCase()
      ) {
        isAdmin = true;
        break;
      }
    }

    return {
      status: 200,
      body: {
        success: true,
        isAdmin,
      },
    };
  } catch (error) {
    return {
      status: 500,
      body: {
        success: false,
        error: error.message,
      },
    };
  }
};
