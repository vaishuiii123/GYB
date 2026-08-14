const { getTableClient } = require("../shared/tableHelper");


module.exports = async function (context, req) {
  try {

    const { id } = req.body;

    const client =
      getTableClient("Participants");

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
