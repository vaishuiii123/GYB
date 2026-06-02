const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
  try {
    const email = req.body.email;

    if (!email) {
      return {
        status: 400,
        body: {
          success: false,
          message: "Email is required"
        }
      };
    }

    const client = TableClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING,
      "User"
    );

    const entities = client.listEntities();

let found = false;
let role = null;
let name = null;

for await (const entity of entities) {
  console.log(entity);

  if (
    entity.Email &&
    entity.Email.toLowerCase() === email.toLowerCase()
  ) {
    found = true;
    role = entity.Role || "";
    name = entity.Name || "";
    break;
  }
}
    
    return {
      status: 200,
      body: {
        success: true,
        found,
        role,
        name
      }
    };
  } catch (error) {
    context.log("Error:", error);

    return {
      status: 500,
      body: {
        success: false,
        error: error.message
      }
    };
  }
};
