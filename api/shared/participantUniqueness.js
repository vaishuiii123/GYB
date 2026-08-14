const { getTableClient } = require("./tableHelper");
const { normalizePhone } = require("./smsProvider");

/**
 * Returns an existing participant entity if the phone number is already used.
 * excludeRowKey: when updating, pass the current participant id so they can keep their own number.
 */
async function findParticipantWithPhone(phone, excludeRowKey) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    return null;
  }

  const client = getTableClient("Participants");

  for await (const entity of client.listEntities({
    queryOptions: { filter: "PartitionKey eq 'Participant'" },
  })) {
    if (excludeRowKey && entity.rowKey === excludeRowKey) {
      continue;
    }

    if (normalizePhone(entity.Phone_No) === normalizedPhone) {
      return entity;
    }
  }

  return null;
}

async function findParticipantWithUsername(username, excludeRowKey) {
  const normalizedUsername = String(username || "")
    .trim()
    .toLowerCase();

  if (!normalizedUsername) {
    return null;
  }

  const client = getTableClient("Participants");

  for await (const entity of client.listEntities({
    queryOptions: { filter: "PartitionKey eq 'Participant'" },
  })) {
    if (excludeRowKey && entity.rowKey === excludeRowKey) {
      continue;
    }

    const storedUsername = String(entity.Username || "")
      .trim()
      .toLowerCase();

    if (storedUsername && storedUsername === normalizedUsername) {
      return entity;
    }
  }

  return null;
}

module.exports = {
  findParticipantWithPhone,
  findParticipantWithUsername,
};
