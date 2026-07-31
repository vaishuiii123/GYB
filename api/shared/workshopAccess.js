const { getTableClient, escapeODataValue } = require("./tableHelper");

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

function getWorkshopEditStatus(workshop, nowMs = Date.now()) {
  if (!workshop) {
    return {
      canEdit: false,
      message: "No workshop is available for your organization.",
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

async function listWorkshopsForOrganization(organizationId) {
  const client = getTableClient("Workshop");
  const workshops = [];
  const normalizedOrganizationId = normalizeId(organizationId);

  for await (const entity of client.listEntities({
    queryOptions: { filter: "PartitionKey eq 'Workshop'" },
  })) {
    const entityOrganizationId = normalizeId(entity.OrganizationId);

    if (entityOrganizationId !== normalizedOrganizationId) {
      continue;
    }

    workshops.push({
      id: entity.rowKey,
      workshopName: entity.WorkshopName || "",
      startDate: entity.StartDate || "",
      endDate: entity.EndDate || "",
      templateId: entity.TemplateId || "",
      templateName: entity.TemplateName || "",
      preOdTemplateId: entity.PreOdTemplateId || "",
      preOdTemplateName: entity.PreOdTemplateName || "",
      preOdQuestionSrNos: entity.PreOdQuestionSrNos || "",
      preOdQuestionCount: entity.PreOdQuestionCount || 0,
      organizationId: entityOrganizationId,
      organizationName: entity.OrganizationName || "",
      participantCount: entity.ParticipantCount || 0,
      createdDate: entity.CreatedDate || "",
    });
  }

  workshops.sort(
    (a, b) =>
      new Date(b.createdDate || 0).getTime() -
      new Date(a.createdDate || 0).getTime()
  );

  return workshops;
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

    workshops.push({
      id: entity.rowKey,
      workshopName: entity.WorkshopName || "",
      startDate: entity.StartDate || "",
      endDate: entity.EndDate || "",
      templateId: entity.TemplateId || "",
      templateName: entity.TemplateName || "",
      preOdTemplateId: entity.PreOdTemplateId || "",
      preOdTemplateName: entity.PreOdTemplateName || "",
      preOdQuestionSrNos: entity.PreOdQuestionSrNos || "",
      preOdQuestionCount: entity.PreOdQuestionCount || 0,
      organizationId: normalizeId(entity.OrganizationId),
      organizationName: entity.OrganizationName || "",
      participantCount: entity.ParticipantCount || 0,
      createdDate: entity.CreatedDate || "",
    });
  }

  workshops.sort(
    (a, b) =>
      new Date(b.createdDate || 0).getTime() -
      new Date(a.createdDate || 0).getTime()
  );

  return workshops;
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
  const client = getTableClient("Workshop");
  const workshops = [];

  for await (const entity of client.listEntities({
    queryOptions: { filter: "PartitionKey eq 'Workshop'" },
  })) {
    const organizationId = normalizeId(entity.OrganizationId);
    const linked = await isParticipantInOrganization(
      participantId,
      organizationId
    );

    if (!linked) {
      continue;
    }

    workshops.push({
      id: entity.rowKey,
      workshopName: entity.WorkshopName || "",
      startDate: entity.StartDate || "",
      endDate: entity.EndDate || "",
      templateId: entity.TemplateId || "",
      templateName: entity.TemplateName || "",
      preOdTemplateId: entity.PreOdTemplateId || "",
      preOdTemplateName: entity.PreOdTemplateName || "",
      preOdQuestionSrNos: entity.PreOdQuestionSrNos || "",
      preOdQuestionCount: entity.PreOdQuestionCount || 0,
      organizationId,
      organizationName: entity.OrganizationName || "",
      participantCount: entity.ParticipantCount || 0,
      createdDate: entity.CreatedDate || "",
    });
  }

  workshops.sort(
    (a, b) =>
      new Date(b.createdDate || 0).getTime() -
      new Date(a.createdDate || 0).getTime()
  );

  return workshops;
}

async function listWorkshopsForParticipant(participantId) {
  const participantClient = getTableClient("Participants");
  let participant = null;

  try {
    participant = await participantClient.getEntity("Participant", participantId);
  } catch {
    participant = null;
  }

  const organizationIds = await listOrganizationIdsForParticipant(participantId);
  const workshops = [];
  const seenWorkshopIds = new Set();

  for (const organizationId of organizationIds) {
    const organizationWorkshops = await listWorkshopsForOrganization(
      organizationId
    );

    for (const workshop of organizationWorkshops) {
      if (seenWorkshopIds.has(workshop.id)) {
        continue;
      }

      seenWorkshopIds.add(workshop.id);
      workshops.push(workshop);
    }
  }

  if (workshops.length === 0) {
    const linkedWorkshops = await listWorkshopsLinkedToParticipant(
      participantId
    );

    for (const workshop of linkedWorkshops) {
      if (seenWorkshopIds.has(workshop.id)) {
        continue;
      }

      seenWorkshopIds.add(workshop.id);
      organizationIds.push(workshop.organizationId);
      workshops.push(workshop);
    }
  }

  if (workshops.length === 0 && participant?.Organisation) {
    const namedWorkshops = await listWorkshopsForOrganizationName(
      participant.Organisation
    );

    for (const workshop of namedWorkshops) {
      if (seenWorkshopIds.has(workshop.id)) {
        continue;
      }

      seenWorkshopIds.add(workshop.id);
      workshops.push(workshop);
    }
  }

  workshops.sort(
    (a, b) =>
      new Date(b.createdDate || 0).getTime() -
      new Date(a.createdDate || 0).getTime()
  );

  return {
    organizationIds: [...new Set(organizationIds.filter(Boolean))],
    workshops,
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
      startDate: entity.StartDate || "",
      endDate: entity.EndDate || "",
      templateId: entity.TemplateId || "",
      templateName: entity.TemplateName || "",
      preOdTemplateId: entity.PreOdTemplateId || "",
      preOdTemplateName: entity.PreOdTemplateName || "",
      preOdQuestionSrNos: entity.PreOdQuestionSrNos || "",
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
};
