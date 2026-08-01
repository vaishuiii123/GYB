const { TableClient } = require("@azure/data-tables");
const { isValidEmail, isValidPhone } = require("../shared/validation");

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

    if (!id) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "Participant id is required.",
        },
      };
      return;
    }

    const trimmedFirst = String(firstName || "").trim();
    const trimmedMiddle = String(middleName || "").trim();
    const trimmedLast = String(lastName || "").trim();
    const trimmedEmail = String(email || "").trim();
    const trimmedPhone = String(phoneNo || "").trim();
    const trimmedPassword = String(password || "").trim();

    if (
      !trimmedFirst ||
      !trimmedLast ||
      !trimmedEmail ||
      !trimmedPhone ||
      !trimmedPassword
    ) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message:
            "First name, last name, email, phone number, and password are required. Middle name is optional.",
        },
      };
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "Enter a valid email address.",
        },
      };
      return;
    }

    if (!isValidPhone(trimmedPhone)) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "Enter a valid phone number.",
        },
      };
      return;
    }

    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const client = TableClient.fromConnectionString(
      connectionString,
      "Participants"
    );

    await client.updateEntity(
      {
        partitionKey: "Participant",
        rowKey: id,
        First_Name: trimmedFirst,
        Middle_Name: trimmedMiddle,
        Last_Name: trimmedLast,
        Email: trimmedEmail,
        Phone_No: trimmedPhone,
        Password: trimmedPassword,
        Role: "Participant",
      },
      "Merge"
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
