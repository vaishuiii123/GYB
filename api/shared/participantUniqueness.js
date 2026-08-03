const { TableClient } = require("@azure/data-tables");
const { normalizePhone } = require("./smsProvider");

function getConnectionString() {
  return process.env.AZURE_STORAGE_CONNECTION_STRING;
}

/**
 * Returns an existing participant entity if the phone number is already used.
 * excludeRowKey: when updating, pass the current participant id so they can keep their own number.
 */
async function findParticipantWithPhone(phone, excludeRowKey) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    return null;
  }

  const client = TableClient.fromConnectionString(
    getConnectionString(),
    "Participants"
  );

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

module.exports = {
  findParticipantWithPhone,
};
