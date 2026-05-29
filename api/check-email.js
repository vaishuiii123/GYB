import { TableClient } from "@azure/data-tables";

export async function GET() {
  try {
    const client = TableClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING,
      "Users"
    );

    const users = [];

    for await (const entity of client.listEntities()) {
      users.push(entity);
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: users.length,
        users
      }),
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
}
