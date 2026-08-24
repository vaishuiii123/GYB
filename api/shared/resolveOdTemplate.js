const { getTableClient } = require("./tableHelper");

function parseQuestionIds(questionIdField) {
  if (!questionIdField) {
    return [];
  }

  return String(questionIdField)
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

async function loadTemplate(templateId) {
  const id = String(templateId || "").trim();
  if (!id) {
    return null;
  }

  const templateTable = getTableClient("Template");

  try {
    return await templateTable.getEntity("Template", id);
  } catch {
    try {
      for await (const entity of templateTable.listEntities()) {
        if (String(entity.rowKey) === id) {
          return entity;
        }
      }
    } catch {
      return null;
    }
  }

  return null;
}

async function findTemplateByName(templateName) {
  const name = String(templateName || "").trim().toLowerCase();
  if (!name) {
    return null;
  }

  const templateTable = getTableClient("Template");
  let best = null;

  for await (const entity of templateTable.listEntities({
    queryOptions: { filter: "PartitionKey eq 'Template'" },
  })) {
    const entityName = String(entity.TemplateName || "")
      .trim()
      .toLowerCase();
    if (entityName !== name) {
      continue;
    }

    const questionCount = parseQuestionIds(entity.QuestionIds).length;
    if (!best || questionCount > parseQuestionIds(best.QuestionIds).length) {
      best = entity;
    }
  }

  return best;
}

/**
 * Prefer Workshop.TemplateId from DB. If that ID points at a template whose
 * name does not match Workshop.TemplateName (common mis-link), resolve by name.
 */
async function resolveOdTemplate(workshopId, templateIdQuery) {
  const workshopKey = String(workshopId || "").trim();
  let workshopTemplateId = "";
  let workshopTemplateName = "";

  if (workshopKey) {
    try {
      const workshop = await getTableClient("Workshop").getEntity(
        "Workshop",
        workshopKey
      );
      workshopTemplateId = String(workshop.TemplateId || "").trim();
      workshopTemplateName = String(workshop.TemplateName || "").trim();
    } catch {
      // ignore
    }
  }

  const candidateId =
    workshopTemplateId || String(templateIdQuery || "").trim();

  if (!candidateId && !workshopTemplateName) {
    return { templateId: "", template: null };
  }

  let template = candidateId ? await loadTemplate(candidateId) : null;

  if (
    workshopTemplateName &&
    (!template ||
      String(template.TemplateName || "").trim() !== workshopTemplateName)
  ) {
    const byName = await findTemplateByName(workshopTemplateName);
    if (byName) {
      return {
        templateId: String(byName.rowKey),
        template: byName,
      };
    }
  }

  return {
    templateId: candidateId,
    template,
  };
}

module.exports = {
  parseQuestionIds,
  loadTemplate,
  findTemplateByName,
  resolveOdTemplate,
};
