const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
  try {

    const {
      id,
      firstName,
      middleName,
      lastName,
      email,
      phoneNo,
      password,
    } = req.body;

    const client =
      TableClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING,
        "Participants"
      );

    await client.updateEntity({
      partitionKey: "Participant",
      rowKey: id,

      First_Name: firstName,
      Middle_Name: middleName,
      Last_Name: lastName,
      Email: email,
      Phone_No: phoneNo,
      Password: password,
    });

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
