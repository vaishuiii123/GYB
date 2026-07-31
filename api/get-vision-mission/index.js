const { TableClient } = require("@azure/data-tables");

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

module.exports = async function (context, req) {
  try {
    const tableClient = TableClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING,
      "VisionMission"
    );

    try {
      const entity = await tableClient.getEntity(
        "VisionMission",
        "default"
      );

      context.res = {
        status: 200,
        body: {
          success: true,
          data: {
            keywords: parseKeywords(entity.Keywords),
            modifiedBy: entity.ModifiedBy || "",
            modifiedDate: entity.ModifiedDate || "",
          },
        },
      };
    } catch {
      context.res = {
        status: 200,
        body: {
          success: true,
          data: {
            keywords: DEFAULT_KEYWORDS,
            modifiedBy: "",
            modifiedDate: "",
          },
        },
      };
    }
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
