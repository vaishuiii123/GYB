const { getTableClient } = require("../shared/tableHelper");
const { CACHE_KEYS, getOrLoad } = require("../shared/listCache");

const DEFAULT_KEYWORDS = [
  "Integrity",
  "Innovation",
  "Customer Focus",
  "Excellence",
  "Trust",
  "Growth",
  "Leadership",
  "Passion",
  "Commitment",
  "Collaboration",
  "Empowerment",
  "Quality",
  "People First",
  "Value Creation",
  "Purpose",
  "Sustainability",
  "Agility",
  "Creativity",
  "Reliability",
  "Transparency",
  "Accountability",
  "Respect",
  "Diversity",
  "Inclusion",
  "Forward Thinking",
  "Efficiency",
  "Ethics",
  "Service Excellence",
  "Teamwork",
  "Continuous Learning",
  "Adaptability",
  "Market Leadership",
  "Social Responsibility",
  "Profitability",
  "Customer Centricity",
];

function parseKeywords(raw) {
  if (!raw) {
    return DEFAULT_KEYWORDS;
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed
      : DEFAULT_KEYWORDS;
  } catch {
    return DEFAULT_KEYWORDS;
  }
}

async function loadVisionMissionKeywords() {
  const tableClient = getTableClient("VisionMission");

  try {
    const entity = await tableClient.getEntity("VisionMission", "default");
    return {
      keywords: parseKeywords(entity.Keywords),
      modifiedBy: entity.ModifiedBy || "",
      modifiedDate: entity.ModifiedDate || "",
    };
  } catch {
    return {
      keywords: DEFAULT_KEYWORDS,
      modifiedBy: "",
      modifiedDate: "",
    };
  }
}

module.exports = async function (context, req) {
  try {
    const { value: data, cacheHit } = await getOrLoad(
      CACHE_KEYS.visionMissionKeywords,
      loadVisionMissionKeywords,
      5 * 60 * 1000
    );

    context.res = {
      status: 200,
      headers: {
        "Cache-Control": "private, max-age=60",
        "X-List-Cache": cacheHit ? "HIT" : "MISS",
      },
      body: {
        success: true,
        data,
      },
    };
  } catch (error) {
    context.res = {
      status: 500,
      body: {
        success: false,
        message: error.message,
      },
    };
  }
};
