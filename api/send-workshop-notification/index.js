const { TableClient } = require("@azure/data-tables");
const { sendSms } = require("../shared/smsProvider");
const {
  buildVerificationCode,
  buildWorkshopSmsMessage,
} = require("../shared/workshopSmsMessage");

async function updateParticipantPassword(participantId, password) {
  const client = TableClient.fromConnectionString(
    process.env.AZURE_STORAGE_CONNECTION_STRING,
    "Participants"
  );

  await client.updateEntity(
    {
      partitionKey: "Participant",
      rowKey: participantId,
      Password: password,
    },
    "Merge"
  );
}

async function getWorkshop(workshopId) {
  const client = TableClient.fromConnectionString(
    process.env.AZURE_STORAGE_CONNECTION_STRING,
    "Workshop"
  );

  try {
    const entity = await client.getEntity("Workshop", workshopId);
    return {
      id: entity.rowKey,
      workshopName: entity.WorkshopName || "",
      startDate: entity.StartDate || "",
      endDate: entity.EndDate || "",
      templateName: entity.TemplateName || "",
      organizationId: entity.OrganizationId || "",
      organizationName: entity.OrganizationName || "",
    };
  } catch {
    return null;
  }
}

async function getOrganizationParticipants(organizationId) {
  const mappingClient = TableClient.fromConnectionString(
    process.env.AZURE_STORAGE_CONNECTION_STRING,
    "OrganizationParticipants"
  );

  const participantClient = TableClient.fromConnectionString(
    process.env.AZURE_STORAGE_CONNECTION_STRING,
    "Participants"
  );

  const participantIds = [];

  for await (const entity of mappingClient.listEntities()) {
    if (entity.OrganizationId === organizationId) {
      participantIds.push(entity.ParticipantId);
    }
  }

  const participants = [];

  for await (const participant of participantClient.listEntities()) {
    if (!participantIds.includes(participant.rowKey)) {
      continue;
    }

    participants.push({
      id: participant.rowKey,
      firstName: participant.First_Name || "",
      lastName: participant.Last_Name || "",
      email: participant.Email || "",
      phoneNo: participant.Phone_No || "",
      password: participant.Password || "",
      organization: participant.Organisation || "",
    });
  }

  return participants;
}

module.exports = async function (context, req) {
  try {
    const { workshopId, loginUrl } = req.body || {};

    if (!workshopId) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "workshopId is required",
        },
      };
      return;
    }

    const workshop = await getWorkshop(workshopId);

    if (!workshop) {
      context.res = {
        status: 404,
        body: {
          success: false,
          message: "Workshop not found",
        },
      };
      return;
    }

    if (!workshop.organizationId) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "Workshop is missing organization information",
        },
      };
      return;
    }

    const appLoginUrl =
      loginUrl ||
      process.env.APP_LOGIN_URL ||
      "https://gentle-sea-0636fbe10.7.azurestaticapps.net";

    const participants = await getOrganizationParticipants(
      workshop.organizationId
    );

    if (participants.length === 0) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "No participants found for this organization",
        },
      };
      return;
    }

    const results = [];

    for (const participant of participants) {
      const displayName =
        `${participant.firstName} ${participant.lastName}`.trim() ||
        participant.email ||
        participant.id;

      if (!participant.phoneNo) {
        results.push({
          participantId: participant.id,
          name: displayName,
          success: false,
          error: "Phone number missing",
        });
        continue;
      }

      if (!participant.email) {
        results.push({
          participantId: participant.id,
          name: displayName,
          success: false,
          error: "Email missing for participant",
        });
        continue;
      }

      let message = "";

      try {
        const verificationCode = buildVerificationCode(participant.password);

        if (verificationCode !== participant.password) {
          await updateParticipantPassword(participant.id, verificationCode);
          participant.password = verificationCode;
        }

        message = buildWorkshopSmsMessage({ verificationCode });

        context.log("Workshop SMS message:", message);
        context.log("Workshop SMS length:", message.length);

        const smsResult = await sendSms(participant.phoneNo, message);

        context.log(
          "BulkSMSLink response:",
          JSON.stringify(smsResult.response)
        );

        results.push({
          participantId: participant.id,
          name: displayName,
          phone: participant.phoneNo,
          success: true,
          messageSent: message,
          provider: smsResult.provider,
          providerResponse: smsResult.response,
        });
      } catch (error) {
        results.push({
          participantId: participant.id,
          name: displayName,
          phone: participant.phoneNo,
          success: false,
          messageSent: message,
          error: error.message,
        });
      }
    }

    const sentCount = results.filter((item) => item.success).length;
    const failedCount = results.length - sentCount;

    context.res = {
      status: 200,
      body: {
        success: sentCount > 0,
        sentCount,
        failedCount,
        total: results.length,
        provider: process.env.SMS_PROVIDER || "bulksmslink",
        results,
        message:
          sentCount === results.length
            ? "Workshop notifications sent to all participants"
            : sentCount > 0
              ? `Sent ${sentCount} of ${results.length} notifications`
              : "Failed to send notifications to all participants",
      },
    };
  } catch (error) {
    context.log("Error in send-workshop-notification:", error);

    context.res = {
      status: 500,
      body: {
        success: false,
        error: error.message,
      },
    };
  }
};
