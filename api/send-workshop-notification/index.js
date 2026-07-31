const { TableClient } = require("@azure/data-tables");

function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function buildMessage({ participant, workshop, loginUrl }) {
  const name = [participant.firstName, participant.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return [
    `Dear ${name || "Participant"},`,
    `You are invited to the GYB workshop "${workshop.workshopName}".`,
    `Schedule: ${formatDateTime(workshop.startDate)} to ${formatDateTime(workshop.endDate)}.`,
    `Organization: ${workshop.organizationName || participant.organization || "-"}.`,
    `Login URL: ${loginUrl}`,
    `Username: ${participant.email}`,
    `Password: ${participant.password}`,
    "Team KNAV",
  ].join(" ");
}

async function sendSms(phone, message) {
  const provider = (process.env.SMS_PROVIDER || "msg91").toLowerCase();

  if (provider === "fast2sms") {
    const apiKey = process.env.FAST2SMS_API_KEY;
    if (!apiKey) {
      throw new Error("FAST2SMS_API_KEY is not configured");
    }

    const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
      method: "POST",
      headers: {
        authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        route: "q",
        message,
        language: "english",
        numbers: phone.replace(/^91/, ""),
      }),
    });

    const data = await response.json();
    if (!response.ok || data.return === false) {
      throw new Error(data.message || "Fast2SMS request failed");
    }

    return data;
  }

  const authKey = process.env.MSG91_AUTH_KEY;
  const senderId = process.env.MSG91_SENDER_ID || "KNAVGY";

  if (!authKey) {
    throw new Error("MSG91_AUTH_KEY is not configured");
  }

  const url =
    "https://api.msg91.com/api/sendhttp.php?" +
    new URLSearchParams({
      authkey: authKey,
      mobiles: phone,
      message,
      sender: senderId,
      route: "4",
      country: "91",
    }).toString();

  const response = await fetch(url);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(text || "MSG91 request failed");
  }

  return { provider: "msg91", response: text };
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
  } catch (error) {
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
      const phone = normalizePhone(participant.phoneNo);

      if (!phone) {
        results.push({
          participantId: participant.id,
          name: `${participant.firstName} ${participant.lastName}`.trim(),
          success: false,
          error: "Phone number missing",
        });
        continue;
      }

      if (!participant.email || !participant.password) {
        results.push({
          participantId: participant.id,
          name: `${participant.firstName} ${participant.lastName}`.trim(),
          success: false,
          error: "Login credentials missing for participant",
        });
        continue;
      }

      try {
        const message = buildMessage({
          participant,
          workshop,
          loginUrl: appLoginUrl,
        });

        await sendSms(phone, message);

        results.push({
          participantId: participant.id,
          name: `${participant.firstName} ${participant.lastName}`.trim(),
          phone,
          success: true,
        });
      } catch (error) {
        results.push({
          participantId: participant.id,
          name: `${participant.firstName} ${participant.lastName}`.trim(),
          phone,
          success: false,
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
        results,
        message:
          sentCount === results.length
            ? "Workshop notifications sent to all participants"
            : `Sent ${sentCount} of ${results.length} notifications`,
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
