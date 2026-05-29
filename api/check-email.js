export async function GET() {
  return new Response(
    JSON.stringify({
      message: "API Working"
    }),
    {
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
}
