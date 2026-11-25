const { ensureTableClient } = require("../shared/tableHelper");
const { invalidate } = require("../shared/listCache");
const { cleanParagraphs } = require("../shared/welcomeContent");

module.exports = async function (context, req) {
  try {
    const { paragraphs, modifiedBy } = req.body || {};
    const cleaned = cleanParagraphs(paragraphs);

    if (cleaned.length === 0) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "Add at least one welcome paragraph.",
        },
      };
      return;
    }

    const tableClient = await ensureTableClient("AppContent");
    const entity = {
      partitionKey: "Welcome",
      rowKey: "default",
      ParagraphsJson: JSON.stringify(cleaned),
      ModifiedBy: modifiedBy || "Admin",
      ModifiedDate: new Date().toISOString(),
    };

    try {
      await tableClient.getEntity("Welcome", "default");
      await tableClient.updateEntity(entity, "Replace");
    } catch {
      await tableClient.createEntity(entity);
    }

    invalidate("list:welcome-content");

    context.res = {
      status: 200,
      body: {
        success: true,
        message: "Welcome screen content updated successfully.",
        data: {
          paragraphs: cleaned,
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
