const { getTableClient, escapeODataValue } = require("./tableHelper");

const PARTICIPANT_CACHE_TTL_MS = 60_000;
let participantRecordsCache = {
  savedAt: 0,
  records: null,
};
const storedNameCache = new Map();

function readField(entity, ...keys) {
  if (!entity) {
    return "";
  }

  for (const key of keys) {
    let value = entity[key];
    if (value && typeof value === "object" && "value" in value) {
      value = value.value;
    }
    const text = String(value ?? "").trim();
    if (text) {
      return text;
    }
  }

  return "";
}

function formatParticipantEntityName(entity) {
  if (!entity) {
    return "";
  }

  const firstName = readField(
    entity,
    "First_Name",
    "firstName",
    "FirstName"
  );
  const middleName = readField(
    entity,
    "Middle_Name",
    "middleName",
    "MiddleName"
  );
  const lastName = readField(entity, "Last_Name", "lastName", "LastName");
  const fullName = [firstName, middleName, lastName].filter(Boolean).join(" ");
  if (fullName) {
    return fullName;
  }

  return (
    readField(entity, "Name", "name") ||
    readField(entity, "Email", "email") ||
    ""
  );
}

function isUsableDisplayName(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) {
    return false;
  }
  const lower = trimmed.toLowerCase();
  if (lower === "participant" || lower === "unknown") {
    return false;
  }
  if (/^\d{10,}$/.test(trimmed)) {
    return false;
  }
  return true;
}

function pickDisplayName(...candidates) {
  for (const candidate of candidates) {
    if (isUsableDisplayName(candidate)) {
      return String(candidate).trim();
    }
  }
  return "";
}

async function loadAllParticipantRecords(options = {}) {
  const forceRefresh = Boolean(options.forceRefresh);
  const now = Date.now();

  if (
    !forceRefresh &&
    participantRecordsCache.records &&
    now - participantRecordsCache.savedAt < PARTICIPANT_CACHE_TTL_MS
  ) {
    return participantRecordsCache.records;
  }

  const byId = new Map();
  const client = getTableClient("Participants");

  for await (const entity of client.listEntities()) {
    const id = String(entity.rowKey || "").trim();
    if (!id) {
      continue;
    }

    byId.set(id, {
      id,
      firstName: readField(entity, "First_Name", "firstName", "FirstName"),
      middleName: readField(
        entity,
        "Middle_Name",
        "middleName",
        "MiddleName"
      ),
      lastName: readField(entity, "Last_Name", "lastName", "LastName"),
      email: readField(entity, "Email", "email"),
      phoneNo: readField(entity, "Phone_No", "phoneNo", "Phone"),
      displayName: formatParticipantEntityName(entity),
    });
  }

  participantRecordsCache = {
    savedAt: now,
    records: byId,
  };

  return byId;
}

async function loadParticipantDisplayName(participantId) {
  const id = String(participantId || "").trim();
  if (!id) {
    return "";
  }

  const cachedRecords = participantRecordsCache.records;
  if (cachedRecords?.has(id)) {
    return cachedRecords.get(id).displayName || "";
  }

  const client = getTableClient("Participants");

  try {
    const entity = await client.getEntity("Participant", id);
    return formatParticipantEntityName(entity);
  } catch {
    // fall through
  }

  return "";
}

async function findStoredNameInTable(tableName, participantId) {
  const client = getTableClient(tableName);
  const filter = `RowKey eq '${escapeODataValue(participantId)}'`;

  for await (const entity of client.listEntities({
    queryOptions: { filter },
  })) {
    const name = pickDisplayName(entity.ParticipantName);
    if (name) {
      return name;
    }
  }

  // Some legacy rows may store the id only in ParticipantId.
  const legacyFilter = `ParticipantId eq '${escapeODataValue(participantId)}'`;
  for await (const entity of client.listEntities({
    queryOptions: { filter: legacyFilter },
  })) {
    const name = pickDisplayName(entity.ParticipantName);
    if (name) {
      return name;
    }
  }

  return "";
}

/**
 * Resolve names for specific participant ids only.
 * Avoids full-table scans of QuestionAnswer / response tables.
 */
async function loadStoredParticipantNames(participantIds = []) {
  const names = new Map();
  const uniqueIds = [
    ...new Set(
      (participantIds || []).map((id) => String(id || "").trim()).filter(Boolean)
    ),
  ];

  if (uniqueIds.length === 0) {
    return names;
  }

  await Promise.all(
    uniqueIds.map(async (participantId) => {
      if (storedNameCache.has(participantId)) {
        const cached = storedNameCache.get(participantId);
        if (cached) {
          names.set(participantId, cached);
        }
        return;
      }

      let found = "";
      for (const tableName of ["PreOdResponse", "WorkshopFeedback"]) {
        try {
          found = await findStoredNameInTable(tableName, participantId);
          if (found) {
            break;
          }
        } catch {
          // table may not exist
        }
      }

      storedNameCache.set(participantId, found);
      if (found) {
        names.set(participantId, found);
      }
    })
  );

  return names;
}

module.exports = {
  formatParticipantEntityName,
  isUsableDisplayName,
  loadAllParticipantRecords,
  loadParticipantDisplayName,
  loadStoredParticipantNames,
  pickDisplayName,
  readField,
};
