const DEFAULT_WELCOME_PARAGRAPHS = [
  "In today's ever-changing business landscape, adaptability is key. KNAV's Organization Development Workshop is a collaborative platform for businesses aiming to accelerate growth. The goal is simple: align strategic objectives with action plans, engage stakeholders, and chart a clear path forward in a resilience-focused environment.",
  "Through this exercise, guided by KNAV experts, you will explore key business facets, uncover strengths and challenges, identify opportunities, and create a roadmap toward your vision.",
  "Together, we will embark on a journey of strategic exploration to unlock your business's full potential. This interactive workshop encourages active participation and idea-sharing, fostering a supportive environment where real breakthroughs happen!",
  'To support this process, KNAV has developed the Grow Your Business platform, where you will complete the Pre-Organisation Development Workshop Questionnaire and collaborate throughout the workshop journey.',
];

function parseParagraphs(raw) {
  if (!raw) {
    return [...DEFAULT_WELCOME_PARAGRAPHS];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [...DEFAULT_WELCOME_PARAGRAPHS];
    }
    const cleaned = parsed
      .map((item) => String(item || "").trim())
      .filter(Boolean);
    return cleaned.length > 0 ? cleaned : [...DEFAULT_WELCOME_PARAGRAPHS];
  } catch {
    return [...DEFAULT_WELCOME_PARAGRAPHS];
  }
}

function cleanParagraphs(input) {
  if (!Array.isArray(input)) {
    return [];
  }
  return input.map((item) => String(item || "").trim()).filter(Boolean);
}

module.exports = {
  DEFAULT_WELCOME_PARAGRAPHS,
  parseParagraphs,
  cleanParagraphs,
};
