const CUSTOM_SR_NO_START = 10001;

function parseCustomQuestions(value) {
  if (!value) {
    return [];
  }

  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item, index) => {
        const question = String(item?.question || "").trim();
        if (!question) {
          return null;
        }

        const srNo = Number(item?.srNo || item?.id);
        return {
          srNo: Number.isFinite(srNo) ? srNo : CUSTOM_SR_NO_START + index,
          category: String(item?.category || "Custom").trim() || "Custom",
          question,
          section: "B",
          isCustom: true,
        };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function normalizeCustomQuestions(customQuestions) {
  if (!Array.isArray(customQuestions)) {
    return [];
  }

  return customQuestions
    .map((item, index) => {
      const question = String(item?.question || "").trim();
      if (!question) {
        return null;
      }

      return {
        srNo: CUSTOM_SR_NO_START + index,
        category: String(item?.category || "Custom").trim() || "Custom",
        question,
      };
    })
    .filter(Boolean);
}

function serializeCustomQuestions(customQuestions) {
  return JSON.stringify(normalizeCustomQuestions(customQuestions));
}

module.exports = {
  CUSTOM_SR_NO_START,
  parseCustomQuestions,
  normalizeCustomQuestions,
  serializeCustomQuestions,
};
