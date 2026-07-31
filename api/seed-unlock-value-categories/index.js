const {
  seedUnlockValueCategories,
} = require("../shared/unlockValueCategories");

module.exports = async function (context, req) {
  try {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

    if (!connectionString) {
      context.res = {
        status: 500,
        body: {
          success: false,
          message: "Azure storage connection string is not configured.",
        },
      };
      return;
    }

    const createdBy = req.body?.createdBy || "Admin";
    const stats = await seedUnlockValueCategories(connectionString, createdBy);

    context.res = {
      status: 200,
      body: {
        success: true,
        message: "Unlock Value category hierarchy imported successfully.",
        stats,
      },
    };
  } catch (error) {
    context.log(error);

    context.res = {
      status: 500,
      body: {
        success: false,
        message: error.message,
      },
    };
  }
};
