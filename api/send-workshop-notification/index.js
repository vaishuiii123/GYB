const { getTableClient } = require("../shared/tableHelper");
const { sendSms } = require("../shared/smsProvider");
const { sendEmail } = require("../shared/emailProvider");
const {
  buildVerificationCode,
  buildWorkshopSmsMessage,
} = require("../shared/workshopSmsMessage");
const {
  buildWorkshopEmailContent,
} = require("../shared/workshopEmailMessage");

async function updateParticipantPassword(participantId, password) {
  const client = getTableClient("Participants");

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
  const client = getTableClient("Workshop");

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
  const mappingClient = getTableClient("OrganizationParticipants");
  const participantClient = getTableClient("Participants");
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

function normalizeParticipantIds(value) {
  if (!value) {
    return null;
  }
  const list = Array.isArray(value) ? value : [value];
  const ids = list.map((item) => String(item || "").trim()).filter(Boolean);
  return ids.length ? new Set(ids) : null;
}

function formatDate(value) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleString();
}

module.exports = async function (context, req) {
  try {
    const {
      workshopId,
      loginUrl,
      participantIds,
      channel = "email",
    } = req.body || {};

    const sendEmailChannel =
      channel === "email" || channel === "both" || channel === "all";
    const sendSmsChannel =
      channel === "sms" || channel === "both" || channel === "all";

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

    if (!sendEmailChannel && !sendSmsChannel) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: 'channel must be "email", "sms", or "both"',
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

    let participants = await getOrganizationParticipants(
      workshop.organizationId
    );

    const filterIds = normalizeParticipantIds(participantIds);
    if (filterIds) {
      participants = participants.filter((item) => filterIds.has(item.id));
    }

    if (participants.length === 0) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: filterIds
            ? "No matching participants found for this workshop"
            : "No participants found for this organization",
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

      const baseResult = {
        participantId: participant.id,
        name: displayName,
        email: participant.email || "",
        phone: participant.phoneNo || "",
      };

      if (sendEmailChannel && !participant.email) {
        results.push({
          ...baseResult,
          success: false,
          channel: "email",
          error: "Email missing for participant",
        });
        if (!sendSmsChannel) {
          continue;
        }
      }

      if (sendSmsChannel && !participant.phoneNo) {
        results.push({
          ...baseResult,
          success: false,
          channel: "sms",
          error: "Phone number missing",
        });
        if (!sendEmailChannel || !participant.email) {
          continue;
        }
      }

      let verificationCode = "";
      try {
        verificationCode = buildVerificationCode(participant.password);
        if (verificationCode !== participant.password) {
          await updateParticipantPassword(participant.id, verificationCode);
          participant.password = verificationCode;
        }
      } catch (error) {
        results.push({
          ...baseResult,
          success: false,
          error: error.message,
        });
        continue;
      }

      if (sendEmailChannel && participant.email) {
        try {
          const emailContent = buildWorkshopEmailContent({
            workshopName: workshop.workshopName,
            organizationName: workshop.organizationName,
            participantName: displayName,
            verificationCode,
            loginUrl: appLoginUrl,
            startDate: formatDate(workshop.startDate),
            endDate: formatDate(workshop.endDate),
          });

          const emailResult = await sendEmail({
            to: participant.email,
            subject: emailContent.subject,
            text: emailContent.text,
            html: emailContent.html,
          });

          results.push({
            ...baseResult,
            success: true,
            channel: "email",
            provider: emailResult.provider,
            providerResponse: emailResult.response,
          });
        } catch (error) {
          results.push({
            ...baseResult,
            success: false,
            channel: "email",
            error: error.message,
          });
        }
      }

      if (sendSmsChannel && participant.phoneNo) {
        let message = "";
        try {
          message = buildWorkshopSmsMessage({ verificationCode });
          context.log("Workshop SMS message:", message);

          const smsResult = await sendSms(participant.phoneNo, message);

          results.push({
            ...baseResult,
            success: true,
            channel: "sms",
            messageSent: message,
            provider: smsResult.provider,
            providerResponse: smsResult.response,
          });
        } catch (error) {
          results.push({
            ...baseResult,
            success: false,
            channel: "sms",
            messageSent: message,
            error: error.message,
          });
        }
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
        channel,
        results,
        message:
          sentCount === results.length
            ? "Workshop notifications sent successfully"
            : sentCount > 0
              ? `Sent ${sentCount} of ${results.length} notifications`
              : "Failed to send notifications",
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
