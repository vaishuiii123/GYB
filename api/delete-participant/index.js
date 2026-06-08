const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
  try {

    const { id } = req.body;

    const client =
      TableClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING,
        "Participants"
      );

    await client.deleteEntity(
      "Participant",
      id
    );

    context.res = {
      status: 200,
      body: {
        success: true,
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
