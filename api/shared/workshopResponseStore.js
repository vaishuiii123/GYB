const {
  ensureTableClient,
  getTableClient,
  escapeODataValue,
} = require("./tableHelper");
const { parseWorkshopEndMs } = require("./workshopAccess");
const { listPreOdResponsesForWorkshop } = require("./preOdResponseStore");
const { PRE_OD_QUESTIONS } = require("./preOdQuestions");
const { parseCustomQuestions } = require("./preOdCustomQuestions");

async function loadParticipantName(participantId) {
  try {
    const client = getTableClient("Participants");
    const entity = await client.getEntity("Participant", participantId);
    const firstName = String(entity.First_Name || "").trim();
    const lastName = String(entity.Last_Name || "").trim();
    const fullName = [firstName, lastName].filter(Boolean).join(" ");
    return fullName || String(entity.Email || "Participant");
  } catch {
    return "Participant";
  }
}

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
      );
      if (!participantId) {
        continue;
      }

      const current = byParticipant.get(participantId) || {
        participantId,
        answers: {},
        submittedDate: "",
        templateId: "",
      };

      if (entity.QuestionId) {
        current.answers[entity.QuestionId] =
          entity.AnswerText || entity.OptionId || "";
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

async function listVisionMissionForParticipants(participantIds, workshopId) {
  const results = [];
  const tableClient = await ensureTableClient("VisionMissionResponse");

  for (const participantId of participantIds) {
    try {
      let entity = null;

      if (workshopId) {
        try {
          entity = await tableClient.getEntity(
            String(workshopId),
            String(participantId)
          );
        } catch {
          entity = null;
        }
      }

      if (!entity) {
        entity = await tableClient.getEntity("Participant", participantId);
      }

      if (
        workshopId &&
        entity.WorkshopId &&
        String(entity.WorkshopId) !== String(workshopId)
      ) {
        continue;
      }

      const visionText = entity.VisionText || "";
      const missionText = entity.MissionText || "";
      if (!visionText && !missionText) {
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
    } catch {
      // no response
    }
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
  const unique = [...new Set(questionIds.filter(Boolean))];
  if (unique.length === 0) {
    return labels;
  }

  const client = getTableClient("Questions");
  await Promise.all(
    unique.map(async (questionId) => {
      try {
        const entity = await client.getEntity("Question", questionId);
        labels[questionId] =
          entity.QuestionText || entity.Question || questionId;
      } catch {
        labels[questionId] = questionId;
      }
    })
  );

  return labels;
}

async function buildWorkshopResponsePayload(workshop) {
  const workshopId = workshop.id;
  const participantIds = await listOrganizationParticipantIds(
    workshop.organizationId
  );

  const [preOdResponses, odResponses, actionableGroups, visionResponses] =
    await Promise.all([
      listPreOdResponsesForWorkshop(workshopId),
      listOdResponsesForWorkshop(workshopId),
      listActionablesForWorkshop(workshopId),
      listVisionMissionForParticipants(participantIds, workshopId),
    ]);

  const allParticipantIds = new Set([
    ...preOdResponses.map((item) => item.participantId),
    ...odResponses.map((item) => item.participantId),
    ...actionableGroups.map((item) => item.participantId),
    ...visionResponses.map((item) => item.participantId),
    ...participantIds,
  ]);

  const nameEntries = await Promise.all(
    [...allParticipantIds].map(async (participantId) => [
      participantId,
      await loadParticipantName(participantId),
    ])
  );
  const names = new Map(nameEntries);

  const questionIds = odResponses.flatMap((item) =>
    Object.keys(item.answers || {})
  );
  const questionLabels = await loadQuestionLabels(questionIds);

  const participants = [...allParticipantIds]
    .map((participantId) => {
      const preOd = preOdResponses.find(
        (item) => item.participantId === participantId
      );
      const od = odResponses.find((item) => item.participantId === participantId);
      const actionables = actionableGroups.find(
        (item) => item.participantId === participantId
      );
      const vision = visionResponses.find(
        (item) => item.participantId === participantId
      );

      const hasAny =
        Boolean(preOd) ||
        Boolean(od && Object.keys(od.answers || {}).length) ||
        Boolean(actionables?.items?.length) ||
        Boolean(vision);

      if (!hasAny) {
        return null;
      }

      return {
        participantId,
        participantName: names.get(participantId) || "Participant",
        preOd: preOd
          ? {
              answers: preOd.answers || {},
              submittedDate: preOd.submittedDate || "",
            }
          : null,
        odChart: od
          ? {
              answers: od.answers || {},
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
  const personalize = (text) =>
    String(text || "")
      .replace(/<<Company's>>/g, `${company}'s`)
      .replace(/KNAV/g, company);

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
      startDate: workshop.startDate,
      endDate: workshop.endDate,
    },
    preOdQuestions,
    questionLabels,
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
