const { TableClient } = require("@azure/data-tables");
const { isValidEmail } = require("../shared/validation");

module.exports = async function (context, req) {
  try {
    const {
      organizationName,
      contactPerson,
      email,
      createdBy,
    } = req.body;

    const name = String(organizationName || "").trim();
    const contact = String(contactPerson || "").trim();
    const orgEmail = String(email || "").trim();

    if (!name || !contact || !orgEmail) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "Organization name, contact person, and email are required.",
        },
      };
      return;
    }

    if (!isValidEmail(orgEmail)) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "Enter a valid email address.",
        },
      };
      return;
    }

    const client = TableClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING,
      "Organization"
    );

    const organizationId = Date.now().toString();

    await client.createEntity({
      partitionKey: "Organization",
      rowKey: organizationId,
      Organization_Name: name,
      Contact_Person: contact,
      Email: orgEmail,
      Created_By: createdBy || "",
    });

    context.res = {
      status: 200,
      body: {
        success: true,
        organizationId,
      },
    };
  } catch (error) {
    context.log(error);

    context.res = {
      status: 500,
      body: {
        success: false,
        error: error.message,
      },
    };
  }
};
