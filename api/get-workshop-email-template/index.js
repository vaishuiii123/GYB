const { getOrLoad } = require("../shared/listCache");
const {
  loadWorkshopEmailTemplate,
} = require("../shared/workshopEmailTemplate");

const EMAIL_TEMPLATE_CACHE_KEY = "list:workshop-email-template";

module.exports = async function (context) {
  try {
    const { value: data, cacheHit } = await getOrLoad(
      EMAIL_TEMPLATE_CACHE_KEY,
      loadWorkshopEmailTemplate,
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
