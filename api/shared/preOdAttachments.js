const {
  normalizeAttachmentsApplicable,
} = require("./attachmentHelper");
const { getTableClient } = require("./tableHelper");

function parseAttachmentsMap(raw) {
  if (!raw) {
    return {};
  }

  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw;
  }

  try {
    const parsed = JSON.parse(String(raw));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

/**
 * Build a Y/N map keyed by question srNo for the given selection.
 * @param {unknown} raw
 * @param {Array<string|number>} srNos
 */
function normalizeQuestionAttachments(raw, srNos) {
  const source = parseAttachmentsMap(raw);
  const result = {};

  for (const srNo of srNos || []) {
    const key = String(srNo);
    result[key] = normalizeAttachmentsApplicable(
      source[key] ?? source[srNo] ?? "N"
    );
  }

  return result;
}

function serializeQuestionAttachments(map) {
  return JSON.stringify(map && typeof map === "object" ? map : {});
}

function getAttachmentFlag(map, srNo) {
  const source = parseAttachmentsMap(map);
  const key = String(srNo);
  return normalizeAttachmentsApplicable(source[key] ?? source[srNo] ?? "N");
}

function hasAnyYes(map) {
  return Object.values(map || {}).some(
    (value) => String(value || "").toUpperCase() === "Y"
  );
}

function mergeAttachmentMaps(primary, secondary, srNos) {
  const result = {};

  for (const srNo of srNos || []) {
    const key = String(srNo);
    const primaryFlag = normalizeAttachmentsApplicable(primary?.[key] || "N");
    const secondaryFlag = normalizeAttachmentsApplicable(
      secondary?.[key] || "N"
    );
    // Y wins from either source so stale workshop snapshots cannot hide
    // attachments that the linked template already enables.
    result[key] = primaryFlag === "Y" || secondaryFlag === "Y" ? "Y" : "N";
  }

  return result;
}

function forceAllYesAttachments(srNos) {
  const result = {};
  for (const srNo of srNos || []) {
    result[String(srNo)] = "Y";
  }
  return result;
}

async function loadTemplateAttachments(templateId, srNos) {
  if (!templateId) {
    return null;
  }

  try {
    const entity = await getTableClient("PreODTemplate").getEntity(
      "PreODTemplate",
      String(templateId)
    );
    return normalizeQuestionAttachments(entity.QuestionAttachments, srNos);
  } catch {
    return null;
  }
}

async function findPreOdTemplateIdByName(templateName) {
  const normalized = String(templateName || "")
    .trim()
    .toLowerCase();

  if (!normalized) {
    return "";
  }

  try {
    const client = getTableClient("PreODTemplate");

    for await (const entity of client.listEntities({
      queryOptions: {
        filter: "PartitionKey eq 'PreODTemplate'",
        select: ["RowKey", "TemplateName"],
      },
    })) {
      if (
        String(entity.TemplateName || "")
          .trim()
          .toLowerCase() === normalized
      ) {
        return String(entity.rowKey || "");
      }
    }
  } catch {
    return "";
  }

  return "";
}

/**
 * Resolve Attachment Y/N for a workshop's Pre OD questions.
 * Linked Pre OD template flags are merged in so admin "Attachment Applicable =
 * Yes" always surfaces on the participant form, even when the workshop was
 * saved earlier with all-N snapshots or a missing template id.
 */
async function resolveWorkshopPreOdAttachments(workshop, srNos) {
  const assignedSrNos = (srNos || []).map((item) => String(item));
  const fromWorkshop = normalizeQuestionAttachments(
    workshop?.preOdQuestionAttachments,
    assignedSrNos
  );

  let templateId = String(workshop?.preOdTemplateId || "").trim();

  if (!templateId && workshop?.preOdTemplateName) {
    templateId = await findPreOdTemplateIdByName(workshop.preOdTemplateName);
  }

  if (!templateId) {
    return fromWorkshop;
  }

  const fromTemplate = await loadTemplateAttachments(templateId, assignedSrNos);

  if (!fromTemplate) {
    return fromWorkshop;
  }

  return mergeAttachmentMaps(fromTemplate, fromWorkshop, assignedSrNos);
}

module.exports = {
  parseAttachmentsMap,
  normalizeQuestionAttachments,
  serializeQuestionAttachments,
  getAttachmentFlag,
  hasAnyYes,
  forceAllYesAttachments,
  loadTemplateAttachments,
  resolveWorkshopPreOdAttachments,
};
