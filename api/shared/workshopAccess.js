const { getTableClient, escapeODataValue } = require("./tableHelper");
const { readWorkshopDate } = require("./workshopDates");

function parseWorkshopEndMs(endDate) {
  if (!endDate) {
    return null;
  }

  const date = new Date(endDate);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const looksLikeDateOnly =
    String(endDate).length <= 10 ||
    (date.getUTCHours() === 0 &&
      date.getUTCMinutes() === 0 &&
      date.getUTCSeconds() === 0);

  if (looksLikeDateOnly) {
    date.setHours(23, 59, 59, 999);
  }

  return date.getTime();
}

function parseWorkshopStartMs(startDate) {
  if (!startDate) {
    return null;
  }

  const date = new Date(startDate);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.getTime();
}

function canEditPreOd(workshop, nowMs = Date.now()) {
  // Admin may assign/edit Pre OD until the workshop starts.
  const startMs = parseWorkshopStartMs(
    workshop?.startDate || workshop?.StartDate
  );

  if (startMs === null) {
    return true;
  }

  return nowMs < startMs;
}

function canFillPreOdWindow(workshop, nowMs = Date.now()) {
  const workshopStartMs = parseWorkshopStartMs(
    workshop?.startDate || workshop?.StartDate
  );
  const preOdStartMs = parseWorkshopStartMs(
    workshop?.preOdStartDate || workshop?.PreOdStartDate
  );

  if (workshopStartMs !== null && nowMs >= workshopStartMs) {
    return {
      canFill: false,
      message: "The workshop has started. Pre OD is now closed.",
    };
  }

  if (preOdStartMs !== null && nowMs < preOdStartMs) {
    return {
      canFill: false,
      message: "Pre OD is not open yet. Please check back at the Pre OD start time.",
    };
  }

  return {
    canFill: true,
    message: "",
  };
}

function getWorkshopEditStatus(workshop, nowMs = Date.now()) {
  if (!workshop) {
    return {
      canEdit: false,
      message: "No workshop is available for your organization.",
    };
  }

  const startMs = parseWorkshopStartMs(
    workshop.startDate || workshop.StartDate
  );

  if (startMs !== null && nowMs < startMs) {
    return {
      canEdit: false,
      message:
        "Workshop modules open once the workshop starts. You can complete Pre OD until then.",
      endDate: workshop.endDate || workshop.EndDate || "",
    };
  }

  const endMs = parseWorkshopEndMs(workshop.endDate || workshop.EndDate);

  if (endMs !== null && nowMs > endMs) {
    return {
      canEdit: false,
      message:
        "The workshop has ended. You can view your responses but can no longer edit them.",
      endDate: workshop.endDate || workshop.EndDate || "",
    };
  }

  return {
    canEdit: true,
    message: "",
    endDate: workshop.endDate || workshop.EndDate || "",
  };
}

function normalizeId(value) {
  return String(value || "").trim();
}

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

async function listOrganizationIdsForParticipant(participantId) {
  const client = getTableClient("OrganizationParticipants");
  const organizationIds = new Set();
  const normalizedParticipantId = normalizeId(participantId);

  if (!normalizedParticipantId) {
    return [];
  }

  try {
    for await (const entity of client.listEntities({
      queryOptions: {
        filter: `RowKey eq '${escapeODataValue(normalizedParticipantId)}'`,
      },
    })) {
      const organizationId = normalizeId(
        entity.OrganizationId || entity.partitionKey
      );

      if (organizationId) {
        organizationIds.add(organizationId);
      }
    }
  } catch (error) {
    // fall back to full scan if filtered query fails
  }

  if (organizationIds.size === 0) {
    for await (const entity of client.listEntities()) {
      const linkedParticipantId = normalizeId(
        entity.ParticipantId || entity.rowKey
      );

      if (linkedParticipantId !== normalizedParticipantId) {
        continue;
      }

      const organizationId = normalizeId(
        entity.OrganizationId || entity.partitionKey
      );

      if (organizationId) {
        organizationIds.add(organizationId);
      }
    }
  }

  return [...organizationIds];
}

function mapWorkshopEntity(entity) {
  return {
    id: entity.rowKey,
    workshopName: entity.WorkshopName || "",
    preOdStartDate: readWorkshopDate(
      entity.PreOdStartDate || entity.preOdStartDate
    ),
    startDate: readWorkshopDate(entity.StartDate || entity.startDate),
    endDate: readWorkshopDate(entity.EndDate || entity.endDate),
    templateId: entity.TemplateId || "",
    templateName: entity.TemplateName || "",
    preOdTemplateId: entity.PreOdTemplateId || "",
    preOdTemplateName: entity.PreOdTemplateName || "",
    preOdQuestionSrNos: entity.PreOdQuestionSrNos || "",
    preOdCustomQuestions: entity.PreOdCustomQuestions || "[]",
    preOdQuestionCount: entity.PreOdQuestionCount || 0,
    organizationId: normalizeId(entity.OrganizationId),
    organizationName: entity.OrganizationName || "",
    participantCount: entity.ParticipantCount || 0,
    createdDate: entity.CreatedDate || "",
  };
}

function sortWorkshopsNewestFirst(workshops) {
  workshops.sort(
    (a, b) =>
      new Date(b.createdDate || 0).getTime() -
      new Date(a.createdDate || 0).getTime()
  );
  return workshops;
}

async function listWorkshopsByOrganizationIds(organizationIds) {
  const orgSet = new Set(
    (organizationIds || []).map(normalizeId).filter(Boolean)
  );

  if (orgSet.size === 0) {
    return [];
  }

  const client = getTableClient("Workshop");
  const workshops = [];

  // Prefer a filtered query for a single org, but never trust an empty
  // filter result — Azure Table filters on custom properties can miss rows
  // that a partition scan still returns.
  if (orgSet.size === 1) {
    const organizationId = [...orgSet][0];

    try {
      for await (const entity of client.listEntities({
        queryOptions: {
          filter: `PartitionKey eq 'Workshop' and OrganizationId eq '${escapeODataValue(
            organizationId
          )}'`,
        },
      })) {
        workshops.push(mapWorkshopEntity(entity));
      }

      if (workshops.length > 0) {
        return sortWorkshopsNewestFirst(workshops);
      }
    } catch {
      // fall through to partition scan
    }
  }

  // Partition scan with in-memory org filter (reliable fallback).
  for await (const entity of client.listEntities({
    queryOptions: { filter: "PartitionKey eq 'Workshop'" },
  })) {
    if (!orgSet.has(normalizeId(entity.OrganizationId))) {
      continue;
    }

    workshops.push(mapWorkshopEntity(entity));
  }

  return sortWorkshopsNewestFirst(workshops);
}

async function listWorkshopsForOrganization(organizationId) {
  return listWorkshopsByOrganizationIds([organizationId]);
}

async function listWorkshopsForOrganizationName(organizationName) {
  const client = getTableClient("Workshop");
  const workshops = [];
  const normalizedOrganizationName = normalizeName(organizationName);

  if (!normalizedOrganizationName) {
    return workshops;
  }

  for await (const entity of client.listEntities({
    queryOptions: { filter: "PartitionKey eq 'Workshop'" },
  })) {
    if (normalizeName(entity.OrganizationName) !== normalizedOrganizationName) {
      continue;
    }

    workshops.push(mapWorkshopEntity(entity));
  }

  return sortWorkshopsNewestFirst(workshops);
}

async function isParticipantInOrganization(participantId, organizationId) {
  const client = getTableClient("OrganizationParticipants");
  const normalizedParticipantId = normalizeId(participantId);
  const normalizedOrganizationId = normalizeId(organizationId);

  if (!normalizedParticipantId || !normalizedOrganizationId) {
    return false;
  }

  try {
    await client.getEntity(normalizedOrganizationId, normalizedParticipantId);
    return true;
  } catch {
    return false;
  }
}

async function listWorkshopsLinkedToParticipant(participantId) {
  // Resolve org links once, then load workshops in a single query path.
  const organizationIds = await listOrganizationIdsForParticipant(participantId);
  return listWorkshopsByOrganizationIds(organizationIds);
}

async function listWorkshopsForParticipant(
  participantId,
  preferredOrganizationId = ""
) {
  const normalizedPreferredOrgId = normalizeId(preferredOrganizationId);

  // Always resolve every organization the participant is assigned to.
  // Preferring only the client org hid workshops under other linked orgs.
  let organizationIds = await listOrganizationIdsForParticipant(participantId);

  if (normalizedPreferredOrgId) {
    const alreadyLinked = organizationIds.some(
      (id) => normalizeId(id) === normalizedPreferredOrgId
    );
    const membershipOk =
      alreadyLinked ||
      (await isParticipantInOrganization(
        participantId,
        normalizedPreferredOrgId
      ));

    if (membershipOk) {
      organizationIds = [
        normalizedPreferredOrgId,
        ...organizationIds.filter(
          (id) => normalizeId(id) !== normalizedPreferredOrgId
        ),
      ];
    }
  }

  let workshops = await listWorkshopsByOrganizationIds(organizationIds);

  // Fallback: match by participant organisation name when org-id links miss.
  if (workshops.length === 0) {
    const participantClient = getTableClient("Participants");
    let participant = null;

    try {
      participant = await participantClient.getEntity(
        "Participant",
        participantId
      );
    } catch {
      participant = null;
    }

    const organisationName =
      participant?.Organisation || participant?.Organization || "";

    if (organisationName) {
      workshops = await listWorkshopsForOrganizationName(organisationName);

      for (const workshop of workshops) {
        if (workshop.organizationId) {
          organizationIds.push(workshop.organizationId);
        }
      }
    }
  }

  // Last resort: if a preferred org id was supplied, still try that org's
  // workshops (covers stale client org id after a new assignment).
  if (workshops.length === 0 && normalizedPreferredOrgId) {
    workshops = await listWorkshopsByOrganizationIds([
      normalizedPreferredOrgId,
    ]);
    if (workshops.length > 0) {
      organizationIds = [normalizedPreferredOrgId, ...organizationIds];
    }
  }

  return {
    organizationIds: [
      ...new Set(organizationIds.map(normalizeId).filter(Boolean)),
    ],
    workshops: sortWorkshopsNewestFirst(workshops),
  };
}

function pickWorkshopForOrganization(workshops, nowMs = Date.now()) {
  if (workshops.length === 0) {
    return null;
  }

  const inSchedule = workshops.find((workshop) => {
    const start = workshop.startDate
      ? new Date(workshop.startDate).getTime()
      : null;
    const endMs = parseWorkshopEndMs(workshop.endDate);

    if (start && nowMs < start) {
      return false;
    }

    if (endMs !== null && nowMs > endMs) {
      return false;
    }

    return true;
  });

  return inSchedule || workshops[0];
}

async function getWorkshopById(workshopId) {
  if (!workshopId) {
    return null;
  }

  const client = getTableClient("Workshop");

  try {
    const entity = await client.getEntity("Workshop", workshopId);
    return {
      id: entity.rowKey,
      workshopName: entity.WorkshopName || "",
      preOdStartDate: readWorkshopDate(
        entity.PreOdStartDate || entity.preOdStartDate
      ),
      startDate: readWorkshopDate(entity.StartDate || entity.startDate),
      endDate: readWorkshopDate(entity.EndDate || entity.endDate),
      templateId: entity.TemplateId || "",
      templateName: entity.TemplateName || "",
      preOdTemplateId: entity.PreOdTemplateId || "",
      preOdTemplateName: entity.PreOdTemplateName || "",
      preOdQuestionSrNos: entity.PreOdQuestionSrNos || "",
      preOdCustomQuestions: entity.PreOdCustomQuestions || "[]",
      preOdQuestionCount: entity.PreOdQuestionCount || 0,
      organizationId: entity.OrganizationId || "",
      organizationName: entity.OrganizationName || "",
    };
  } catch {
    return null;
  }
}

async function getWorkshopForOrganization(organizationId) {
  const workshops = await listWorkshopsForOrganization(organizationId);
  return pickWorkshopForOrganization(workshops);
}

function getPreOdFillStatus(workshop, nowMs = Date.now()) {
  const questionCount = Number(workshop?.preOdQuestionCount || 0);

  if (questionCount <= 0) {
    return {
      available: false,
      canFill: false,
      message: "Pre OD has not been assigned for this workshop yet.",
    };
  }

  const windowStatus = canFillPreOdWindow(workshop, nowMs);
  if (!windowStatus.canFill) {
    return {
      available: true,
      canFill: false,
      message: windowStatus.message,
    };
  }

  return {
    available: true,
    canFill: true,
    message: "",
  };
}

async function assertPreOdFillable({ workshopId, organizationId }) {
  let workshop = null;

  if (workshopId) {
    workshop = await getWorkshopById(workshopId);
  }

  if (!workshop && organizationId) {
    workshop = await getWorkshopForOrganization(organizationId);
  }

  if (!workshop) {
    return {
      allowed: false,
      status: 404,
      message: "Workshop not found.",
    };
  }

  const fillStatus = getPreOdFillStatus(workshop);

  if (!fillStatus.available) {
    return {
      allowed: false,
      status: 404,
      message: fillStatus.message,
    };
  }

  if (!fillStatus.canFill) {
    return {
      allowed: false,
      status: 403,
      message: fillStatus.message,
    };
  }

  return {
    allowed: true,
    workshop,
  };
}

async function assertWorkshopEditable({ workshopId, organizationId }) {
  let workshop = null;

  if (workshopId) {
    workshop = await getWorkshopById(workshopId);
  }

  if (!workshop && organizationId) {
    workshop = await getWorkshopForOrganization(organizationId);
  }

  const editStatus = getWorkshopEditStatus(workshop);

  if (!editStatus.canEdit) {
    return {
      allowed: false,
      status: 403,
      message: editStatus.message,
    };
  }

  return {
    allowed: true,
    workshop,
  };
}

module.exports = {
  parseWorkshopEndMs,
  parseWorkshopStartMs,
  canEditPreOd,
  canFillPreOdWindow,
  getPreOdFillStatus,
  getWorkshopEditStatus,
  normalizeId,
  normalizeName,
  listOrganizationIdsForParticipant,
  listWorkshopsForOrganization,
  listWorkshopsForOrganizationName,
  listWorkshopsLinkedToParticipant,
  listWorkshopsForParticipant,
  pickWorkshopForOrganization,
  getWorkshopById,
  getWorkshopForOrganization,
  assertWorkshopEditable,
  assertPreOdFillable,
};
