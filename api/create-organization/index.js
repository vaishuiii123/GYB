const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
  try { 
    const {
        organizationName,
        contactPerson,
        email,
        createdBy,
      } = req.body;


if (!organizationName || !contactPerson || !email) {
      return {
        status: 400,
        body: {
          success: false,
          message: "All fields are required",
        },
      };
    }

    const client =
      TableClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING,
        "Organization"
      );
    
const rowKey = Date.now().toString();

    
    await client.createEntity({
      partitionKey: "Organization",
      rowKey: rowKey,
      Organization_Name: organizationName,
      Contact_Person: contactPerson,
      Email: email,
      Created_By: createdBy || "",
    });


    return {
      status: 200,
      body: {
        success: true,
      },
    };
  } catch (error) {
    context.log(error);

    return {
      status: 500,
      body: {
        success: false,
        error: error.message,
      },
    };
  }
};
