const { ensureTableClient, escapeODataValue } = require("./tableHelper");
const { parseWorkshopEndMs } = require("./workshopAccess");
const { FEEDBACK_QUESTIONS } = require("./workshopFeedback");

function isWorkshopEnded(workshop, nowMs = Date.now()) {
  const endMs = parseWorkshopEndMs(workshop?.endDate || workshop?.EndDate);
  return endMs !== null && nowMs > endMs;
}

function getFeedbackAccessStatus(workshop, existingFeedback, nowMs = Date.now()) {
  if (!workshop) {
    return {
      available: false,
      canSubmit: false,
      submitted: false,
      message: "No workshop is available.",
    };
  }

  if (!isWorkshopEnded(workshop, nowMs)) {
    return {
      available: false,
      canSubmit: false,
      submitted: Boolean(existingFeedback),
      message: "Workshop feedback opens after the workshop has ended.",
    };
  }

  if (existingFeedback) {
    return {
      available: true,
      canSubmit: false,
      submitted: true,
      message: "You have already submitted feedback for this workshop.",
    };
  }

  return {
    available: true,
    canSubmit: true,
    submitted: false,
    message: "",
  };
}

function validateAnswers(rawAnswers) {
  const answers = {};
  const source =
    rawAnswers && typeof rawAnswers === "object" ? rawAnswers : {};

  for (const question of FEEDBACK_QUESTIONS) {
    const value = source[question.id];

    if (question.type === "rating") {
      const rating = Number(value);
      if (question.required && (!rating || rating < 1 || rating > 5)) {
        return {
          ok: false,
          message: `Please rate: ${question.label}`,
        };
      }
      if (value !== undefined && value !== "" && value !== null) {
        answers[question.id] = String(rating);
      }
      continue;
    }

    if (question.type === "yesno") {
      const normalized = String(value || "").trim().toLowerCase();
      if (question.required && !["yes", "no"].includes(normalized)) {
        return {
          ok: false,
          message: `Please answer: ${question.label}`,
        };
      }
      if (normalized) {
        answers[question.id] = normalized === "yes" ? "Yes" : "No";
      }
      continue;
    }

    const text = String(value || "").trim();
    if (question.required && !text) {
      return {
        ok: false,
        message: `Please answer: ${question.label}`,
      };
    }
    answers[question.id] = text;
  }

  return { ok: true, answers };
}

function mapFeedbackEntity(entity, workshopId, participantId) {
  let answers = {};
  try {
    answers = JSON.parse(entity.AnswersJson || "{}");
  } catch {
    answers = {};
  }

  return {
    participantId: entity.ParticipantId || participantId,
    participantName: entity.ParticipantName || "",
    workshopId: entity.WorkshopId || workshopId,
    organizationId: entity.OrganizationId || "",
    answers,
    submittedDate: entity.SubmittedDate || "",
  };
}

async function getFeedback(workshopId, participantId) {
  if (!workshopId || !participantId) {
    return null;
  }

  const tableClient = await ensureTableClient("WorkshopFeedback");
  const normalizedWorkshopId = String(workshopId).trim();
  const normalizedParticipantId = String(participantId).trim();

  try {
    const entity = await tableClient.getEntity(
      normalizedWorkshopId,
      normalizedParticipantId
    );
    return mapFeedbackEntity(
      entity,
      normalizedWorkshopId,
      normalizedParticipantId
    );
  } catch {
    // fall through to filtered lookup for legacy/mismatched keys
  }

  try {
    for await (const entity of tableClient.listEntities({
      queryOptions: {
        filter: `PartitionKey eq '${escapeODataValue(
          normalizedWorkshopId
        )}' and ParticipantId eq '${escapeODataValue(
          normalizedParticipantId
        )}'`,
      },
    })) {
      return mapFeedbackEntity(
        entity,
        normalizedWorkshopId,
        normalizedParticipantId
      );
    }
  } catch {
    // ignore and return null
  }

  return null;
}

async function saveFeedback({
  workshopId,
  participantId,
  organizationId,
  workshopName,
  participantName,
  answers,
}) {
  const tableClient = await ensureTableClient("WorkshopFeedback");
  const submittedDate = new Date().toISOString();
  const normalizedWorkshopId = String(workshopId).trim();
  const normalizedParticipantId = String(participantId).trim();

  const entity = {
    partitionKey: normalizedWorkshopId,
    rowKey: normalizedParticipantId,
    ParticipantId: normalizedParticipantId,
    ParticipantName: participantName || "",
    WorkshopId: normalizedWorkshopId,
    WorkshopName: workshopName || "",
    OrganizationId: organizationId || "",
    AnswersJson: JSON.stringify(answers || {}),
    SubmittedDate: submittedDate,
  };

  // upsert keeps answers recoverable if a prior create partially succeeded
  await tableClient.upsertEntity(entity, "Replace");

  return {
    participantId: normalizedParticipantId,
    workshopId: normalizedWorkshopId,
    answers,
    submittedDate,
  };
}

async function listFeedbackForWorkshop(workshopId) {
  const tableClient = await ensureTableClient("WorkshopFeedback");
  const items = [];

  for await (const entity of tableClient.listEntities({
    queryOptions: {
      filter: `PartitionKey eq '${escapeODataValue(String(workshopId))}'`,
    },
  })) {
    let answers = {};
    try {
      answers = JSON.parse(entity.AnswersJson || "{}");
    } catch {
      answers = {};
    }

    items.push({
      participantId: entity.ParticipantId || entity.rowKey,
      participantName: entity.ParticipantName || "Participant",
      workshopId: entity.WorkshopId || workshopId,
      answers,
      submittedDate: entity.SubmittedDate || "",
    });
  }

  items.sort(
    (a, b) =>
      new Date(b.submittedDate || 0).getTime() -
      new Date(a.submittedDate || 0).getTime()
  );

  return items;
}

module.exports = {
  isWorkshopEnded,
  getFeedbackAccessStatus,
  validateAnswers,
  getFeedback,
  saveFeedback,
  listFeedbackForWorkshop,
};
