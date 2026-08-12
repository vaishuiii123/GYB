const { TableClient } = require("@azure/data-tables");
const { isValidEmail, isValidPhone } = require("../shared/validation");
const { normalizePhone } = require("../shared/smsProvider");
const { findParticipantWithPhone, findParticipantWithUsername } = require("../shared/participantUniqueness");

module.exports = async function (context, req) {
  try {
    const {
      id,
      firstName,
      middleName,
      lastName,
      email,
      username,
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
    const trimmedUsername = String(username || "").trim();
    const trimmedPhone = String(phoneNo || "").trim();
    const trimmedPassword = String(password || "").trim();

    if (
      !trimmedFirst ||
      !trimmedLast ||
      !trimmedEmail ||
      !trimmedUsername ||
      !trimmedPhone ||
      !trimmedPassword
    ) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message:
            "First name, last name, email, username, phone number, and password are required. Middle name is optional.",
        },
      };
      return;
    }

    if (trimmedUsername.length < 3) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "Username must be at least 3 characters.",
        },
      };
      return;
    }

    if (/\s/.test(trimmedUsername)) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "Username cannot contain spaces.",
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

    const existingByPhone = await findParticipantWithPhone(trimmedPhone, id);
    if (existingByPhone) {
      context.res = {
        status: 409,
        body: {
          success: false,
          message: "This phone number is already registered.",
        },
      };
      return;
    }

    const existingByUsername = await findParticipantWithUsername(
      trimmedUsername,
      id
    );
    if (existingByUsername) {
      context.res = {
        status: 409,
        body: {
          success: false,
          message: "This username is already taken.",
        },
      };
      return;
    }

    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const client = TableClient.fromConnectionString(
      connectionString,
      "Participants"
    );

    const normalizedPhone = normalizePhone(trimmedPhone);

    await client.updateEntity(
      {
        partitionKey: "Participant",
        rowKey: id,
        First_Name: trimmedFirst,
        Middle_Name: trimmedMiddle,
        Last_Name: trimmedLast,
        Email: trimmedEmail,
        Username: trimmedUsername,
        Phone_No: normalizedPhone || trimmedPhone,
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
