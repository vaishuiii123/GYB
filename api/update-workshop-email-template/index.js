const { invalidate } = require("../shared/listCache");
const {
  saveWorkshopEmailTemplate,
} = require("../shared/workshopEmailTemplate");

module.exports = async function (context, req) {
  try {
    const { subject, body, modifiedBy } = req.body || {};
    const saved = await saveWorkshopEmailTemplate({
      subject,
      body,
      modifiedBy,
    });

    invalidate("list:workshop-email-template");

    context.res = {
      status: 200,
      body: {
        success: true,
        message: "Workshop email template updated successfully.",
        data: saved,
      },
    };
  } catch (error) {
    context.res = {
      status: error.message.includes("required") ? 400 : 500,
      body: {
        success: false,
        message: error.message,
      },
    };
  }
};
