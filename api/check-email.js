import { TableClient } from "@azure/data-tables";

export async function POST(request) {
  try {
    const { email } = await request.json();

    const client = TableClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING,
      "AdminMailID"
    );

    let isAdmin = false;

    for await (const entity of client.listEntities()) {
      if (
        entity.Email &&
        entity.Email.toLowerCase() === email.toLowerCase()
      ) {
        isAdmin = true;
        break;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        isAdmin
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
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
}
