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

/**
 * Resolve Attachment Y/N for a workshop's Pre OD questions.
 * Prefers workshop.PreOdQuestionAttachments; falls back to linked Pre OD template.
 */
async function resolveWorkshopPreOdAttachments(workshop, srNos) {
  const assignedSrNos = (srNos || []).map((item) => String(item));
  let map = normalizeQuestionAttachments(
    workshop?.preOdQuestionAttachments,
    assignedSrNos
  );

  if (!hasAnyYes(map) && workshop?.preOdTemplateId) {
    const fromTemplate = await loadTemplateAttachments(
      workshop.preOdTemplateId,
      assignedSrNos
    );
    if (fromTemplate && hasAnyYes(fromTemplate)) {
      map = fromTemplate;
    }
  }

  return map;
}

module.exports = {
  parseAttachmentsMap,
  normalizeQuestionAttachments,
  serializeQuestionAttachments,
  getAttachmentFlag,
  hasAnyYes,
  loadTemplateAttachments,
  resolveWorkshopPreOdAttachments,
};
