const { getTableClient } = require("../shared/tableHelper");


module.exports = async function (context, req) {
  try {
    const tableClient = getTableClient("VisionMission");

    const { keywords, modifiedBy } = req.body;

    if (!Array.isArray(keywords) || keywords.length === 0) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "At least one keyword is required.",
        },
      };
      return;
    }

    const cleanedKeywords = keywords
      .map((keyword) => String(keyword || "").trim())
      .filter(Boolean);

    if (cleanedKeywords.length === 0) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "At least one valid keyword is required.",
        },
      };
      return;
    }

    const entity = {
      partitionKey: "VisionMission",
      rowKey: "default",
      Keywords: JSON.stringify(cleanedKeywords),
      ModifiedBy: modifiedBy || "Admin",
      ModifiedDate: new Date().toISOString(),
    };

    try {
      await tableClient.getEntity("VisionMission", "default");
      await tableClient.updateEntity(entity, "Replace");
    } catch {
      await tableClient.createEntity(entity);
    }

    context.res = {
      status: 200,
      body: {
        success: true,
        message: "Vision & Mission keywords updated successfully.",
        data: {
          keywords: cleanedKeywords,
        },
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
