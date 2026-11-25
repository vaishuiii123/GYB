const { ensureTableClient } = require("./tableHelper");

const DEFAULT_EMAIL_SUBJECT =
  "Your Organisation Development Workshop with KNAV - Next Steps";

const DEFAULT_EMAIL_BODY = [
  "Dear {{participantName}},",
  "",
  "Team KNAV is delighted to invite you to your Organisation Development Workshop on {{odDates}}.",
  "",
  "This workshop is designed as a collaborative space to review the current state of {{organizationName}} and co-create a roadmap for its growth and development. Together, we will explore key areas such as your vision and mission, growth strategy, processes, service offerings, market opportunities, and governance - with the aim of aligning today's actions with tomorrow's aspirations.",
  "",
  "Before the session, we would like to gather a well-rounded understanding of your business, including your perspectives on its future, as well as key facts about its financial position, market landscape, and overall operations. Please complete the Pre-Organisation Development Workshop Questionnaire on our Grow Your Business Platform using the details below:",
  "",
  "Website: {{loginUrl}}",
  "Login ID: {{loginId}}",
  "Password: {{password}}",
  "",
  "Kindly share your responses on the platform by {{responseDeadline}}.",
  "",
  "If you have any questions or need support, feel free to reach out directly to a Team KNAV member over email.",
  "",
  "We look forward to your inputs and to an engaging workshop ahead!",
  "",
  "Best regards,",
  "KNAV Advisory Team",
].join("\n");

function getDefaultWorkshopEmailTemplate() {
  return {
    subject: DEFAULT_EMAIL_SUBJECT,
    body: DEFAULT_EMAIL_BODY,
  };
}

async function loadWorkshopEmailTemplate() {
  const tableClient = await ensureTableClient("AppContent");

  try {
    const entity = await tableClient.getEntity("WorkshopEmail", "default");
    const subject = String(entity.Subject || "").trim();
    const body = String(entity.BodyText || "").trim();
    if (!subject || !body) {
      return getDefaultWorkshopEmailTemplate();
    }
    return { subject, body };
  } catch {
    return getDefaultWorkshopEmailTemplate();
  }
}

async function saveWorkshopEmailTemplate({ subject, body, modifiedBy }) {
  const cleanedSubject = String(subject || "").trim();
  const cleanedBody = String(body || "").trim();

  if (!cleanedSubject || !cleanedBody) {
    throw new Error("Subject and email body are required.");
  }

  const tableClient = await ensureTableClient("AppContent");
  const entity = {
    partitionKey: "WorkshopEmail",
    rowKey: "default",
    Subject: cleanedSubject,
    BodyText: cleanedBody,
    ModifiedBy: modifiedBy || "Admin",
    ModifiedDate: new Date().toISOString(),
  };

  try {
    await tableClient.getEntity("WorkshopEmail", "default");
    await tableClient.updateEntity(entity, "Replace");
  } catch {
    await tableClient.createEntity(entity);
  }

  return {
    subject: cleanedSubject,
    body: cleanedBody,
  };
}

module.exports = {
  DEFAULT_EMAIL_SUBJECT,
  DEFAULT_EMAIL_BODY,
  getDefaultWorkshopEmailTemplate,
  loadWorkshopEmailTemplate,
  saveWorkshopEmailTemplate,
};
