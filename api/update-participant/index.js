const { TableClient } = require("@azure/data-tables");

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

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
      organisation,
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

    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const client = TableClient.fromConnectionString(
      connectionString,
      "Participants"
    );

    await client.updateEntity(
      {
        partitionKey: "Participant",
        rowKey: id,
        First_Name: firstName,
        Middle_Name: middleName || "",
        Last_Name: lastName,
        Email: email?.trim() || "",
        Phone_No: phoneNo || "",
        Password: password,
        Organisation: organisation?.trim() || "",
        Role: "Participant",
      },
      "Merge"
    );

    if (organisation?.trim()) {
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

        let alreadyLinked = false;
        for await (const entity of linkClient.listEntities()) {
          if (
            entity.OrganizationId === organizationId &&
            entity.ParticipantId === id
          ) {
            alreadyLinked = true;
            break;
          }
        }

        if (!alreadyLinked) {
          try {
            await linkClient.createEntity({
              partitionKey: organizationId,
              rowKey: id,
              OrganizationId: organizationId,
              ParticipantId: id,
              CreatedDate: new Date().toISOString(),
            });
          } catch (linkError) {
            context.log("OrganizationParticipants link skipped:", linkError.message);
          }
        }
      }
    }

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
