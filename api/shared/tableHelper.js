const { TableClient, TableServiceClient } = require("@azure/data-tables");

function getTableClient(tableName) {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

  if (!connectionString) {
    throw new Error("AZURE_STORAGE_CONNECTION_STRING is not configured.");
  }

  return TableClient.fromConnectionString(connectionString, tableName);
}

async function ensureTableClient(tableName) {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

  if (!connectionString) {
    throw new Error("AZURE_STORAGE_CONNECTION_STRING is not configured.");
  }

  const serviceClient = TableServiceClient.fromConnectionString(connectionString);

  try {
    await serviceClient.createTable(tableName);
  } catch (error) {
    if (error.statusCode !== 409) {
      throw error;
    }
  }

  return TableClient.fromConnectionString(connectionString, tableName);
}

async function listPartition(tableClient, partitionKey) {
  const items = [];

  for await (const entity of tableClient.listEntities({
    queryOptions: { filter: `PartitionKey eq '${escapeODataValue(partitionKey)}'` },
  })) {
    items.push(entity);
  }

  return items;
}

function escapeODataValue(value) {
  return String(value).replace(/'/g, "''");
}

async function getEntitiesByKeys(tableClient, partitionKey, rowKeys) {
  const uniqueKeys = [...new Set(rowKeys.filter(Boolean))];

  if (uniqueKeys.length === 0) {
    return [];
  }

  const entities = await Promise.all(
    uniqueKeys.map(async (rowKey) => {
      try {
        return await tableClient.getEntity(partitionKey, rowKey);
      } catch {
        return null;
      }
    })
  );

  return entities.filter(Boolean);
}

function groupOptionsByQuestionIds(allOptions, questionIds) {
  const questionIdSet = new Set(questionIds);
  const optionsByQuestionId = new Map();

  for (const option of allOptions) {
    const questionId = option.QuestionId;
    if (!questionId || !questionIdSet.has(questionId)) {
      continue;
    }

    if (!optionsByQuestionId.has(questionId)) {
      optionsByQuestionId.set(questionId, []);
    }

    optionsByQuestionId.get(questionId).push({
      id: option.rowKey,
      optionText: option.OptionText,
    });
  }

  return optionsByQuestionId;
}

async function listAnswersForWorkshop(answerTable, participantId, workshopId) {
  const answers = {};
  let organizationId = "";
  let templateId = "";
  let submittedDate = "";

  try {
    for await (const entity of answerTable.listEntities({
      queryOptions: {
        filter: `PartitionKey eq '${escapeODataValue(
          participantId
        )}' and WorkshopId eq '${escapeODataValue(workshopId)}'`,
      },
    })) {
      if (entity.QuestionId) {
        answers[entity.QuestionId] = entity.AnswerText || entity.OptionId || "";
      }

      organizationId = entity.OrganizationId || organizationId;
      templateId = entity.TemplateId || templateId;
      submittedDate = entity.SubmittedDate || submittedDate;
    }
  } catch {
    // table may not exist yet
  }

  return {
    answers,
    organizationId,
    templateId,
    submittedDate,
  };
}

module.exports = {
  getTableClient,
  ensureTableClient,
  listPartition,
  escapeODataValue,
  getEntitiesByKeys,
  groupOptionsByQuestionIds,
  listAnswersForWorkshop,
};
