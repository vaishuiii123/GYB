const {
  CACHE_KEYS,
  invalidate,
  invalidatePrefix,
} = require("./listCache");

function invalidateParticipants(organizationId) {
  invalidate(CACHE_KEYS.participants);
  if (organizationId) {
    invalidatePrefix(`list:org-participants:${organizationId}`);
  } else {
    invalidatePrefix("list:org-participants:");
  }
  invalidatePrefix("list:workshop-by-org:");
}

function invalidateQuestionStructure() {
  invalidate(CACHE_KEYS.questions);
  invalidate(CACHE_KEYS.allCategories);
  invalidate(CACHE_KEYS.tags);
  invalidate("question-options:all");
  invalidate("od-chart:category-tree");
  invalidatePrefix("cat-questions:");
  invalidatePrefix("od-template:");
  invalidatePrefix("template-details:");
}

function invalidateCategoryStructure() {
  invalidate(CACHE_KEYS.allCategories);
  invalidate(CACHE_KEYS.topCategories);
  invalidate("od-chart:category-tree");
  invalidatePrefix("cat-questions:");
  invalidatePrefix("od-template:");
  invalidatePrefix("template-details:");
}

function invalidateTemplateStructure() {
  invalidate(CACHE_KEYS.templates);
  invalidate(CACHE_KEYS.preOdTemplates);
  invalidatePrefix("od-template:");
  invalidatePrefix("template-details:");
  invalidatePrefix("pre-od-template-details:");
}

module.exports = {
  invalidateParticipants,
  invalidateQuestionStructure,
  invalidateCategoryStructure,
  invalidateTemplateStructure,
};
