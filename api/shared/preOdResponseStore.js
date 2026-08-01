const { ensureTableClient, escapeODataValue } = require("./tableHelper");

const LEGACY_PARTITION = "Participant";

function buildEntity({
  workshopId,
  participantId,
  organizationId,
  workshopName,
  answers,
  submittedDate,
  participantName,
}) {
  return {
    partitionKey: String(workshopId),
    rowKey: String(participantId),
    ParticipantId: String(participantId),
    OrganizationId: organizationId || "",
    WorkshopId: String(workshopId),
    WorkshopName: workshopName || "",
    ParticipantName: participantName || "",
    AnswersJson: JSON.stringify(answers),
    SubmittedDate: submittedDate,
  };
}

function parseAnswers(raw) {
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeResponse(entity) {
  if (!entity) {
    return null;
  }

  return {
    participantId: entity.ParticipantId || entity.rowKey || "",
    organizationId: entity.OrganizationId || "",
    workshopId: entity.WorkshopId || entity.partitionKey || "",
    workshopName: entity.WorkshopName || "",
    participantName: entity.ParticipantName || "",
    answers: parseAnswers(entity.AnswersJson),
    submittedDate: entity.SubmittedDate || "",
  };
}

async function getPreOdResponse(workshopId, participantId) {
  if (!workshopId || !participantId) {
    return null;
  }

  const tableClient = await ensureTableClient("PreOdResponse");

  try {
    const entity = await tableClient.getEntity(
      String(workshopId),
      String(participantId)
    );
    return normalizeResponse(entity);
  } catch {
    // fall through to legacy lookup
  }

  try {
    const entity = await tableClient.getEntity(
      LEGACY_PARTITION,
      String(participantId)
    );

    if (
      entity.WorkshopId &&
      String(entity.WorkshopId) === String(workshopId)
    ) {
      return normalizeResponse(entity);
    }
  } catch {
    return null;
  }

  return null;
}

async function savePreOdResponse(payload) {
  const tableClient = await ensureTableClient("PreOdResponse");
  const submittedDate = payload.submittedDate || new Date().toISOString();
  const entity = buildEntity({
    ...payload,
    submittedDate,
  });

  try {
    await tableClient.getEntity(entity.partitionKey, entity.rowKey);
    await tableClient.updateEntity(entity, "Replace");
  } catch {
    await tableClient.createEntity(entity);
  }

  if (entity.partitionKey !== LEGACY_PARTITION) {
    try {
      const legacy = await tableClient.getEntity(
        LEGACY_PARTITION,
        entity.rowKey
      );

      if (
        legacy.WorkshopId &&
        String(legacy.WorkshopId) === String(entity.WorkshopId)
      ) {
        await tableClient.deleteEntity(LEGACY_PARTITION, entity.rowKey);
      }
    } catch {
      // no legacy record
    }
  }

  return normalizeResponse(entity);
}

async function listPreOdResponsesForWorkshop(workshopId) {
  const tableClient = await ensureTableClient("PreOdResponse");
  const responses = [];
  const seenParticipants = new Set();

  for await (const entity of tableClient.listEntities({
    queryOptions: {
      filter: `PartitionKey eq '${escapeODataValue(String(workshopId))}'`,
    },
  })) {
    const normalized = normalizeResponse(entity);
    if (!normalized?.participantId) {
      continue;
    }

    seenParticipants.add(normalized.participantId);
    responses.push(normalized);
  }

  for await (const entity of tableClient.listEntities({
    queryOptions: {
      filter: `PartitionKey eq '${escapeODataValue(LEGACY_PARTITION)}'`,
    },
  })) {
    if (
      !entity.WorkshopId ||
      String(entity.WorkshopId) !== String(workshopId)
    ) {
      continue;
    }

    const normalized = normalizeResponse(entity);
    if (!normalized?.participantId || seenParticipants.has(normalized.participantId)) {
      continue;
    }

    responses.push(normalized);
  }

  responses.sort(
    (a, b) =>
      new Date(b.submittedDate || 0).getTime() -
      new Date(a.submittedDate || 0).getTime()
  );

  return responses;
}

async function listPreOdWorkshopSummaries() {
  const tableClient = await ensureTableClient("PreOdResponse");
  const summaryMap = new Map();

  for await (const entity of tableClient.listEntities()) {
    const workshopId = String(
      entity.partitionKey === LEGACY_PARTITION
        ? entity.WorkshopId || ""
        : entity.partitionKey || entity.WorkshopId || ""
    );

    if (!workshopId || workshopId === LEGACY_PARTITION) {
      continue;
    }

    const current = summaryMap.get(workshopId) || {
      workshopId,
      workshopName: entity.WorkshopName || "",
      submissionCount: 0,
      participantIds: new Set(),
    };

    const participantId = String(entity.ParticipantId || entity.rowKey || "");
    if (participantId && !current.participantIds.has(participantId)) {
      current.participantIds.add(participantId);
      current.submissionCount += 1;
    }

    if (!current.workshopName && entity.WorkshopName) {
      current.workshopName = entity.WorkshopName;
    }

    summaryMap.set(workshopId, current);
  }

  return [...summaryMap.values()]
    .map(({ participantIds, ...item }) => item)
    .filter((item) => item.submissionCount > 0)
    .sort((a, b) => b.submissionCount - a.submissionCount);
}

module.exports = {
  getPreOdResponse,
  savePreOdResponse,
  listPreOdResponsesForWorkshop,
  listPreOdWorkshopSummaries,
  parseAnswers,
};
