const { TableClient, AzureNamedKeyCredential } =
  require("@azure/data-tables");

module.exports = async function (context, req) {

  const { email, organization, password } = req.body;

  const credential = new AzureNamedKeyCredential(
    process.env.STORAGE_ACCOUNT_NAME,
    process.env.STORAGE_ACCOUNT_KEY
  );

  const tableClient = new TableClient(
    `https://${process.env.STORAGE_ACCOUNT_NAME}.table.core.windows.net`,
    "Participants",
    credential
  );

  let found = false;
  let user = null;

  for await (const entity of tableClient.listEntities()) {

    if (
      entity.Email === email &&
      entity.Organisation === organization &&
      entity.Password === password
    ) {
      found = true;
      user = entity;
      break;
    }
  }

  context.res = {
    body: {
      success: found,
      user
    }
  };
};
