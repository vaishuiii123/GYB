const {
  getTableClient,
  getEntitiesByKeys,
  listPartition,
} = require("../shared/tableHelper");
const { sendSms } = require("../shared/smsProvider");
const { sendEmail } = require("../shared/emailProvider");
const { buildWorkshopSmsMessage } = require("../shared/workshopSmsMessage");
const {
  buildWorkshopEmailContent,
} = require("../shared/workshopEmailMessage");

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

  const mappings = await listPartition(mappingClient, organizationId);
  const participantIds = mappings
    .map((entity) =>
      String(entity.ParticipantId || entity.rowKey || "").trim()
    )
    .filter(Boolean);

  const records = await getEntitiesByKeys(
    participantClient,
    "Participant",
    participantIds
  );

  return records.map((participant) => ({
    id: participant.rowKey,
    firstName: participant.First_Name || "",
    lastName: participant.Last_Name || "",
    email: participant.Email || "",
    username: participant.Username || "",
    phoneNo: participant.Phone_No || "",
    password: participant.Password || "",
    organization: participant.Organisation || "",
  }));
}

/** Fresh Username + Password from Participants table (source of truth). */
async function getParticipantCredentials(participantId) {
  const client = getTableClient("Participants");
  try {
    const entity = await client.getEntity("Participant", participantId);
    return {
      username: String(entity.Username || "").trim(),
      email: String(entity.Email || "").trim(),
      password: String(entity.Password || "").trim(),
      firstName: String(entity.First_Name || "").trim(),
      lastName: String(entity.Last_Name || "").trim(),
    };
  } catch {
    return null;
  }
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
  const datePart = date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const timePart = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `${datePart} | ${timePart}`;
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

      const credentials = await getParticipantCredentials(participant.id);
      const loginId =
        (credentials && credentials.username) ||
        String(participant.username || "").trim() ||
        (credentials && credentials.email) ||
        String(participant.email || "").trim();
      const loginPassword =
        (credentials && credentials.password) ||
        String(participant.password || "").trim();
      const greetingName =
        `${(credentials && credentials.firstName) || participant.firstName || ""} ${(credentials && credentials.lastName) || participant.lastName || ""}`.trim() ||
        displayName;

      if (sendEmailChannel && participant.email) {
        if (!loginId || !loginPassword) {
          results.push({
            ...baseResult,
            success: false,
            channel: "email",
            error: !loginId
              ? "Login ID (username) missing for participant"
              : "Password missing for participant in database",
          });
        } else {
          try {
            const emailContent = buildWorkshopEmailContent({
              workshopName: workshop.workshopName,
              organizationName: workshop.organizationName,
              participantName: greetingName,
              loginId,
              password: loginPassword,
              loginUrl: appLoginUrl,
              startDate: workshop.startDate,
              endDate: workshop.endDate,
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
      }

      if (sendSmsChannel && participant.phoneNo) {
        let message = "";
        try {
          message = buildWorkshopSmsMessage({
            verificationCode: loginPassword,
          });
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
    const firstFailure = results.find((item) => !item.success);
    const failureHint = firstFailure?.error
      ? String(firstFailure.error)
      : "Failed to send notifications";

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
              : failureHint,
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
