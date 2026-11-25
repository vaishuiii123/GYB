const { ensureTableClient } = require("../shared/tableHelper");
const { getOrLoad } = require("../shared/listCache");
const {
  DEFAULT_WELCOME_PARAGRAPHS,
  parseParagraphs,
} = require("../shared/welcomeContent");

const WELCOME_CONTENT_CACHE_KEY = "list:welcome-content";

async function loadWelcomeContent() {
  const tableClient = await ensureTableClient("AppContent");

  try {
    const entity = await tableClient.getEntity("Welcome", "default");
    return {
      paragraphs: parseParagraphs(entity.ParagraphsJson),
      modifiedBy: entity.ModifiedBy || "",
      modifiedDate: entity.ModifiedDate || "",
    };
  } catch {
    return {
      paragraphs: [...DEFAULT_WELCOME_PARAGRAPHS],
      modifiedBy: "",
      modifiedDate: "",
    };
  }
}

module.exports = async function (context) {
  try {
    const { value: data, cacheHit } = await getOrLoad(
      WELCOME_CONTENT_CACHE_KEY,
      loadWelcomeContent,
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
