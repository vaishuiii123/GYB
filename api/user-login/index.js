const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {

  try {

    const { email, organization, password } = req.body;

    const client = TableClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING,
      "Participants"
    );

    let found = false;
    let user = null;

    for await (const entity of client.listEntities()) {

      if (
        entity.Email === email &&
        entity.Organisation === organization &&
        entity.Password === password
      ) {
        found = true;
        user = entity;
        break;
      }
    }

    return {
      status: 200,
      body: {
        success: found,
        user
      }
    };

  } catch (error) {

    context.log(error);

    return {
      status: 500,
      body: {
        success: false,
        error: error.message
      }
    };
  }
};
