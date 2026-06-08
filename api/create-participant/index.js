const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
  try {
    const {
      firstName,
      middleName,
      lastName,
      email,
      phoneNo,
      password,
      createdBy,
    } = req.body;

    if (
      !firstName ||
      !lastName ||
      !email ||
      !password
    ) {
      return {
        status: 400,
        body: {
          success: false,
          message: "Required fields missing",
        },
      };
    }

    const client = TableClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING,
      "Participants"
    );

    await client.createEntity({
      partitionKey: "Participant",
      rowKey: Date.now().toString(),

      First_Name: firstName,
      Middle_Name: middleName || "",
      Last_Name: lastName,
      Email: email,
      Phone_No: phoneNo || "",
      Password: password,
      Created_By: createdBy,
    });

    return {
      status: 200,
      body: {
        success: true,
      },
    };
  } catch (error) {
    context.log(error);

    return {
      status: 500,
      body: {
        success: false,
        error: error.message,
      },
    };
  }
};
