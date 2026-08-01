const { TableClient } = require("@azure/data-tables");
const { isValidEmail } = require("../shared/validation");

module.exports = async function (context, req) {
  try {
    const {
      id,
      organizationName,
      contactPerson,
      email,
    } = req.body;

    const name = String(organizationName || "").trim();
    const contact = String(contactPerson || "").trim();
    const orgEmail = String(email || "").trim();

    if (!id || !name || !contact || !orgEmail) {
      context.res = {
        status: 400,
        body: {
          success: false,
          error: "Organization name, contact person, and email are required.",
        },
      };
      return;
    }

    if (!isValidEmail(orgEmail)) {
      context.res = {
        status: 400,
        body: {
          success: false,
          error: "Enter a valid email address.",
        },
      };
      return;
    }

    const client =
      TableClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING,
        "Organization"
      );

    await client.updateEntity(
      {
        partitionKey: "Organization",
        rowKey: id,
        Organization_Name: name,
        Contact_Person: contact,
        Email: orgEmail,
      },
      "Merge"
    );

    context.res = {
      status: 200,
      body: {
        success: true,
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
