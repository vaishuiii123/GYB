import { TableClient } from "@azure/data-tables";

export async function POST(request) {

  try {

    const {
      organizationName,
      contactPerson,
      email
    } = await request.json();

    const client =
      TableClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING,
        "Organization"
      );

    const entity = {

      partitionKey:
        "Organisation_name",

      rowKey:
        Date.now().toString(),

      Organisation_Name:
        organizationName,

      Contact_Person:
        contactPerson,

      Email:
        email
    };

    await client.createEntity(entity);

    return new Response(
      JSON.stringify({
        success: true
      }),
      {
        headers: {
          "Content-Type":
            "application/json"
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
          "Content-Type":
            "application/json"
        }
      }
    );
  }
}
