const { TableClient } = require("@azure/data-tables");

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

module.exports = async function (context, req) {
  try {
    const {
      firstName,
      middleName,
      lastName,
      email,
      phoneNo,
      password,
      organisation,
      createdBy,
    } = req.body;

    if (!firstName || !lastName || !email || !password || !organisation) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message:
            "First name, last name, email, password, and organisation are required.",
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
      First_Name: firstName,
      Middle_Name: middleName || "",
      Last_Name: lastName,
      Email: email.trim(),
      Phone_No: phoneNo || "",
      Password: password,
      Organisation: organisation.trim(),
      Role: "Participant",
      Created_By: createdBy || "",
    });

    const orgClient = TableClient.fromConnectionString(
      connectionString,
      "Organization"
    );

    let organizationId = null;
    for await (const entity of orgClient.listEntities()) {
      if (normalize(entity.Organization_Name) === normalize(organisation)) {
        organizationId = entity.rowKey;
        break;
      }
    }

    if (organizationId) {
      const linkClient = TableClient.fromConnectionString(
        connectionString,
        "OrganizationParticipants"
      );

      try {
        await linkClient.createEntity({
          partitionKey: organizationId,
          rowKey: participantId,
          OrganizationId: organizationId,
          ParticipantId: participantId,
          CreatedBy: createdBy || "",
          CreatedDate: new Date().toISOString(),
        });
      } catch (linkError) {
        context.log("OrganizationParticipants link skipped:", linkError.message);
      }
    }

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
