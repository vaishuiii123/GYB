const { TableClient, AzureNamedKeyCredential } =
  require("@azure/data-tables");

module.exports = async function (context, req) {
  try {
    context.log("User Login API Called");

    const { email, organization, password } = req.body || {};

    context.log("Email:", email);
    context.log("Organization:", organization);

    if (!email || !organization || !password) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "Missing required fields"
        }
      };
      return;
    }

    const accountName = process.env.STORAGE_ACCOUNT_NAME;
    const accountKey = process.env.STORAGE_ACCOUNT_KEY;

    context.log("Storage Account:", accountName);
    context.log("Key Exists:", !!accountKey);

    const credential = new AzureNamedKeyCredential(
      accountName,
      accountKey
    );

    const tableClient = new TableClient(
      `https://${accountName}.table.core.windows.net`,
      "Participants",
      credential
    );

    let foundUser = null;

    for await (const entity of tableClient.listEntities()) {
      context.log("Checking:", entity.Email);

      if (
        entity.Email === email &&
        entity.Organisation === organization &&
        entity.Password === password
      ) {
        foundUser = entity;
        break;
      }
    }

    if (foundUser) {
      context.res = {
        status: 200,
        body: {
          success: true,
          user: foundUser
        }
      };
    } else {
      context.res = {
        status: 200,
        body: {
          success: false,
          message: "Invalid credentials"
        }
      };
    }

  } catch (err) {
    context.log("LOGIN ERROR:", err);

    context.res = {
      status: 500,
      body: {
        success: false,
        error: err.message
      }
    };
  }
};
