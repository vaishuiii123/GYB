
const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
  try {
    const email = req.body.email;

    const client = TableClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING,
      "User"
    );

   const entities = client.listEntities({
  queryOptions: {
    filter: `Email eq '${email}'`
  }
});

let isAdmin = false;

for await (const entity of entities) {
  isAdmin = true;
  break; // we only need one match
}

    return {
      status: 200,
      body: {
        success: true,
        isAdmin,
      },
    };
  } catch (error) {
    return {
      status: 500,
      body: {
        success: false,
        error: error.message,
      },
    };
  }
};
