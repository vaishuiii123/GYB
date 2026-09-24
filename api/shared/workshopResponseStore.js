const {
  ensureTableClient,
  getTableClient,
  escapeODataValue,
} = require("./tableHelper");
const { parseWorkshopEndMs } = require("./workshopAccess");
const { listPreOdResponsesForWorkshop } = require("./preOdResponseStore");
const { PRE_OD_QUESTIONS, personalizePreOdQuestion } = require("./preOdQuestions");
const { parseCustomQuestions } = require("./preOdCustomQuestions");
const {
  loadParticipantRecordsByIds,
  loadParticipantDisplayName,
  pickDisplayName,
} = require("./participantNames");

async function listOrganizationParticipantIds(organizationId) {
  const ids = new Set();
  if (!organizationId) {
    return [];
  }

  try {
    const client = getTableClient("OrganizationParticipants");
    for await (const entity of client.listEntities({
      queryOptions: {
        filter: `PartitionKey eq '${escapeODataValue(organizationId)}'`,
      },
    })) {
      const participantId = String(entity.ParticipantId || entity.rowKey || "");
      if (participantId) {
        ids.add(participantId);
      }
    }
  } catch {
    // table may not exist
  }

  return [...ids];
}

async function listOdResponsesForWorkshop(workshopId) {
  const byParticipant = new Map();
  const answerTable = await ensureTableClient("QuestionAnswer");

  try {
    for await (const entity of answerTable.listEntities({
      queryOptions: {
        filter: `WorkshopId eq '${escapeODataValue(String(workshopId))}'`,
      },
    })) {
      const participantId = String(
        entity.partitionKey || entity.ParticipantId || ""
      ).trim();
      if (!participantId) {
        continue;
      }

      const current = byParticipant.get(participantId) || {
        participantId,
        participantName: "",
        answers: {},
        notes: {},
        attachments: {},
        submittedDate: "",
        templateId: "",
      };

      if (entity.QuestionId) {
        current.answers[entity.QuestionId] =
          entity.AnswerText || entity.OptionId || "";

        const noteText = String(entity.NoteText || "").trim();
        if (noteText) {
          current.notes[entity.QuestionId] = noteText;
        }

        const {
          attachmentsFromAnswerEntity,
        } = require("./attachmentHelper");
        const list = attachmentsFromAnswerEntity(entity);
        if (list.length > 0) {
          current.attachments[entity.QuestionId] = list;
        }
      }

      if (
        entity.ParticipantName &&
        !current.participantName
      ) {
        current.participantName = String(entity.ParticipantName).trim();
      }

      if (
        entity.SubmittedDate &&
        (!current.submittedDate ||
          entity.SubmittedDate > current.submittedDate)
      ) {
        current.submittedDate = entity.SubmittedDate;
      }

      current.templateId = entity.TemplateId || current.templateId;
      byParticipant.set(participantId, current);
    }
  } catch {
    // ignore
  }

  return [...byParticipant.values()];
}

async function listActionablesForWorkshop(workshopId) {
  const byParticipant = new Map();
  const tableClient = await ensureTableClient("ActionableItem");

  try {
    for await (const entity of tableClient.listEntities({
      queryOptions: {
        filter: `WorkshopId eq '${escapeODataValue(String(workshopId))}'`,
      },
    })) {
      const participantId = String(
        entity.partitionKey || entity.ParticipantId || ""
      );
      if (!participantId) {
        continue;
      }

      const current = byParticipant.get(participantId) || {
        participantId,
        items: [],
      };

      current.items.push({
        id: entity.rowKey,
        categoryName: entity.CategoryName || "",
        categoryPath: entity.CategoryPath || "",
        description: entity.Description || "",
        timeline: entity.Timeline || "",
        responsiblePersons: entity.ResponsiblePersons || "",
        comments: entity.Comments || "",
        createdDate: entity.CreatedDate || "",
        updatedDate: entity.UpdatedDate || "",
      });

      byParticipant.set(participantId, current);
    }
  } catch {
    // ignore
  }

  return [...byParticipant.values()];
}

async function listVisionMissionForWorkshop(workshopId) {
  const results = [];
  const normalizedWorkshopId = String(workshopId || "").trim();
  if (!normalizedWorkshopId) {
    return results;
  }

  const tableClient = await ensureTableClient("VisionMissionResponse");

  try {
    // Workshop-scoped rows use PartitionKey = workshopId (fast path).
    for await (const entity of tableClient.listEntities({
      queryOptions: {
        filter: `PartitionKey eq '${escapeODataValue(normalizedWorkshopId)}'`,
      },
    })) {
      const participantId = String(entity.rowKey || entity.ParticipantId || "").trim();
      const visionText = entity.VisionText || "";
      const missionText = entity.MissionText || "";
      if (!participantId || (!visionText && !missionText)) {
        continue;
      }

      results.push({
        participantId,
        visionText,
        missionText,
        visionKeywords: safeJsonArray(entity.VisionKeywords),
        missionKeywords: safeJsonArray(entity.MissionKeywords),
        submittedDate: entity.SubmittedDate || "",
      });
    }
  } catch {
    // table may not exist
  }

  return results;
}

function safeJsonArray(value) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.map((item) => String(item || "").trim()).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

async function loadQuestionLabels(questionIds) {
  const labels = {};
  const types = {};
  const unique = [...new Set(questionIds.filter(Boolean))];
  if (unique.length === 0) {
    return { labels, types };
  }

  const client = getTableClient("Questions");
  await Promise.all(
    unique.map(async (questionId) => {
      try {
        const entity = await client.getEntity("Question", questionId);
        labels[questionId] =
          entity.QuestionText || entity.Question || questionId;
        types[questionId] = entity.QuestionType || "";
      } catch {
        labels[questionId] = questionId;
        types[questionId] = "";
      }
    })
  );

  return { labels, types };
}

async function buildWorkshopResponsePayload(workshop) {
  const workshopId = workshop.id;

  // Fetch response sources first — do not scan the whole org roster.
  const [preOdResponses, odResponses, actionableGroups, visionResponses] =
    await Promise.all([
      listPreOdResponsesForWorkshop(workshopId),
      listOdResponsesForWorkshop(workshopId),
      listActionablesForWorkshop(workshopId),
      listVisionMissionForWorkshop(workshopId),
    ]);

  const allParticipantIds = new Set([
    ...preOdResponses.map((item) => item.participantId),
    ...odResponses.map((item) => item.participantId),
    ...actionableGroups.map((item) => item.participantId),
    ...visionResponses.map((item) => item.participantId),
  ]);

  const participantIdList = [...allParticipantIds]
    .map((id) => String(id || "").trim())
    .filter(Boolean);

  // Point-read only responders (avoids full Participants table scan).
  const participantRecords = await loadParticipantRecordsByIds(
    participantIdList
  );

  // Fill any missing ids with a direct lookup fallback.
  await Promise.all(
    participantIdList.map(async (participantId) => {
      if (participantRecords.has(participantId)) {
        return;
      }
      const displayName = await loadParticipantDisplayName(participantId);
      if (displayName) {
        participantRecords.set(participantId, {
          id: participantId,
          firstName: "",
          middleName: "",
          lastName: "",
          email: "",
          phoneNo: "",
          displayName,
        });
      }
    })
  );

  const questionIds = [
    ...new Set(
      odResponses.flatMap((item) => [
        ...Object.keys(item.answers || {}),
        ...Object.keys(item.notes || {}),
        ...Object.keys(item.attachments || {}),
      ])
    ),
  ];
  const { labels: questionLabels, types: questionTypes } =
    await loadQuestionLabels(questionIds);

  const preOdById = new Map(
    preOdResponses.map((item) => [String(item.participantId).trim(), item])
  );
  const odById = new Map(
    odResponses.map((item) => [String(item.participantId).trim(), item])
  );
  const actionableById = new Map(
    actionableGroups.map((item) => [String(item.participantId).trim(), item])
  );
  const visionById = new Map(
    visionResponses.map((item) => [String(item.participantId).trim(), item])
  );

  const participants = participantIdList
    .map((participantId) => {
      const preOd = preOdById.get(participantId);
      const od = odById.get(participantId);
      const actionables = actionableById.get(participantId);
      const vision = visionById.get(participantId);

      const hasAny =
        Boolean(preOd) ||
        Boolean(
          od &&
            (Object.keys(od.answers || {}).length ||
              Object.keys(od.notes || {}).length ||
              Object.keys(od.attachments || {}).length)
        ) ||
        Boolean(actionables?.items?.length) ||
        Boolean(vision);

      if (!hasAny) {
        return null;
      }

      const record = participantRecords.get(participantId);
      const participantName =
        pickDisplayName(
          record?.displayName,
          od?.participantName,
          preOd?.participantName
        ) || "Unknown";

      return {
        participantId,
        participantName,
        firstName: record?.firstName || "",
        lastName: record?.lastName || "",
        email: record?.email || "",
        preOd: preOd
          ? {
              answers: preOd.answers || {},
              attachments: preOd.attachments || {},
              submittedDate: preOd.submittedDate || "",
            }
          : null,
        odChart: od
          ? {
              answers: od.answers || {},
              notes: od.notes || {},
              attachments: od.attachments || {},
              submittedDate: od.submittedDate || "",
            }
          : null,
        visionMission: vision || null,
        actionables: actionables?.items || [],
      };
    })
    .filter(Boolean)
    .sort((a, b) =>
      a.participantName.localeCompare(b.participantName, undefined, {
        sensitivity: "base",
      })
    );

  const assignedSrNos = String(workshop.preOdQuestionSrNos || "")
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => !Number.isNaN(item));
  const questionMap = new Map(
    PRE_OD_QUESTIONS.map((item) => [item.srNo, item])
  );
  const company = workshop.organizationName || "the company";
  const personalize = (text) => personalizePreOdQuestion(text, company);

  const bankQuestions = assignedSrNos
    .map((srNo) => questionMap.get(srNo))
    .filter(Boolean)
    .map((item) => ({
      srNo: item.srNo,
      category: item.category,
      question: personalize(item.question),
    }));

  const customQuestions = parseCustomQuestions(
    workshop.preOdCustomQuestions
  ).map((item) => ({
    srNo: item.srNo,
    category: item.category,
    question: personalize(item.question),
  }));

  const preOdQuestions = [...bankQuestions, ...customQuestions];

  return {
    workshop: {
      id: workshop.id,
      workshopName: workshop.workshopName,
      organizationName: workshop.organizationName,
      organizationId: workshop.organizationId || "",
      startDate: workshop.startDate,
      endDate: workshop.endDate,
    },
    preOdQuestions,
    questionLabels,
    questionTypes,
    participants,
    counts: {
      participants: participants.length,
      preOd: participants.filter((item) => item.preOd).length,
      odChart: participants.filter((item) => item.odChart).length,
      visionMission: participants.filter((item) => item.visionMission).length,
      actionables: participants.filter((item) => item.actionables.length > 0)
        .length,
    },
  };
}

function isWorkshopEnded(workshop, nowMs = Date.now()) {
  const endMs = parseWorkshopEndMs(workshop?.endDate || workshop?.EndDate);
  return endMs !== null && nowMs > endMs;
}

module.exports = {
  buildWorkshopResponsePayload,
  isWorkshopEnded,
  listOdResponsesForWorkshop,
  listActionablesForWorkshop,
};
