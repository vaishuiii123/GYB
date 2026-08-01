const { TableClient } = require("@azure/data-tables");
const { isValidEmail, isValidPhone } = require("../shared/validation");

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

    const participantId = Date.now().toString();

    await client.createEntity({
      partitionKey: "Participant",
      rowKey: participantId,
      First_Name: trimmedFirst,
      Middle_Name: trimmedMiddle,
      Last_Name: trimmedLast,
      Email: trimmedEmail,
      Phone_No: trimmedPhone,
      Password: trimmedPassword,
      Organisation: "",
      Role: "Participant",
      Created_By: createdBy || "",
    });

    context.res = {
      status: 200,
      body: {
        success: true,
        participantId,
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
