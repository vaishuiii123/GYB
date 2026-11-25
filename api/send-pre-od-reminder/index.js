const {
  getTableClient,
  getEntitiesByKeys,
  listPartition,
} = require("../shared/tableHelper");
const { sendEmail } = require("../shared/emailProvider");
const {
  listPreOdResponsesForWorkshop,
} = require("../shared/preOdResponseStore");
const { getWorkshopById } = require("../shared/workshopAccess");

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
  }));
}

function hasMeaningfulPreOdResponse(response) {
  if (!response) {
    return false;
  }
  const answers =
    response.answers && typeof response.answers === "object"
      ? response.answers
      : {};
  return Object.values(answers).some(
    (value) => String(value || "").trim().length > 0
  );
}

function buildReminderEmail({ participantName, workshopName, loginUrl }) {
  const name = String(participantName || "Participant").trim();
  const workshop = String(workshopName || "your workshop").trim();
  const url = String(loginUrl || "")
    .trim()
    .replace(/\/?$/, "/");

  const subject = `Reminder: Complete your Pre-OD questionnaire for ${workshop}`;
  const text = [
    `Dear ${name},`,
    "",
    `This is a gentle reminder to complete your Pre-Organisation Development Workshop Questionnaire for ${workshop}.`,
    "",
    "Your responses help us prepare a more useful and focused workshop session.",
    url ? `Please sign in here: ${url}` : null,
    "",
    "Thank you,",
    "KNAV Advisory Team",
  ]
    .filter((line) => line !== null)
    .join("\n");

  const html = `<p>Dear ${name},</p>
<p>This is a gentle reminder to complete your <strong>Pre-Organisation Development Workshop Questionnaire</strong> for <strong>${workshop}</strong>.</p>
<p>Your responses help us prepare a more useful and focused workshop session.</p>
${url ? `<p>Please sign in here: <a href="${url}">${url}</a></p>` : ""}
<p>Thank you,<br/>KNAV Advisory Team</p>`;

  return { subject, text, html };
}

module.exports = async function (context, req) {
  try {
    const { workshopId, loginUrl, participantIds } = req.body || {};

    if (!workshopId) {
      context.res = {
        status: 400,
        body: { success: false, message: "workshopId is required." },
      };
      return;
    }

    const workshop = await getWorkshopById(workshopId);
    if (!workshop) {
      context.res = {
        status: 404,
        body: { success: false, message: "Workshop not found." },
      };
      return;
    }

    if (!workshop.organizationId) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "Workshop is missing organization information.",
        },
      };
      return;
    }

    let participants = await getOrganizationParticipants(
      workshop.organizationId
    );
    const filterIds = Array.isArray(participantIds)
      ? new Set(
          participantIds.map((item) => String(item || "").trim()).filter(Boolean)
        )
      : null;
    if (filterIds && filterIds.size > 0) {
      participants = participants.filter((item) => filterIds.has(item.id));
    }

    const responses = await listPreOdResponsesForWorkshop(workshop.id);
    const completedIds = new Set(
      responses
        .filter((item) => hasMeaningfulPreOdResponse(item))
        .map((item) => String(item.participantId || "").trim())
        .filter(Boolean)
    );

    const incomplete = participants.filter(
      (item) => item.email && !completedIds.has(String(item.id))
    );

    if (incomplete.length === 0) {
      context.res = {
        status: 200,
        body: {
          success: true,
          message: "All participants with email have already started Pre-OD.",
          sentCount: 0,
          total: 0,
          results: [],
        },
      };
      return;
    }

    const appLoginUrl =
      loginUrl ||
      process.env.APP_LOGIN_URL ||
      "https://gentle-sea-0636fbe10.7.azurestaticapps.net";

    const results = [];
    for (const participant of incomplete) {
      const name = [participant.firstName, participant.lastName]
        .map((part) => String(part || "").trim())
        .filter(Boolean)
        .join(" ");
      try {
        const content = buildReminderEmail({
          participantName: name || participant.email,
          workshopName: workshop.workshopName,
          loginUrl: appLoginUrl,
        });
        const emailResult = await sendEmail({
          to: participant.email,
          subject: content.subject,
          text: content.text,
          html: content.html,
        });
        results.push({
          id: participant.id,
          email: participant.email,
          name,
          success: true,
          provider: emailResult.provider,
        });
      } catch (error) {
        results.push({
          id: participant.id,
          email: participant.email,
          name,
          success: false,
          error: error.message,
        });
      }
    }

    const sentCount = results.filter((item) => item.success).length;

    context.res = {
      status: 200,
      body: {
        success: true,
        message: `Sent ${sentCount} of ${results.length} Pre-OD reminder emails.`,
        sentCount,
        total: results.length,
        results,
      },
    };
  } catch (error) {
    context.log(error);
    context.res = {
      status: 500,
      body: {
        success: false,
        message: error.message,
      },
    };
  }
};
