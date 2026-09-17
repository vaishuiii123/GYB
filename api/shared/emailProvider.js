function isEmailBypassEnabled() {
  return (
    String(process.env.EMAIL_DEV_BYPASS || "").toLowerCase() === "true" ||
    String(process.env.EMAIL_PROVIDER || "").toLowerCase() === "mock"
  );
}

function isGraphEmailConfigured() {
  const tenantId = process.env.GRAPH_TENANT_ID || process.env.AZURE_TENANT_ID;
  const clientId = process.env.GRAPH_CLIENT_ID || process.env.AZURE_CLIENT_ID;
  const clientSecret =
    process.env.GRAPH_CLIENT_SECRET || process.env.AZURE_CLIENT_SECRET;
  const from =
    process.env.EMAIL_FROM ||
    process.env.GRAPH_SENDER_EMAIL ||
    process.env.WORKSHOP_EMAIL_FROM;

  return Boolean(tenantId && clientId && clientSecret && from);
}

function shouldUseEmailBypass() {
  if (isEmailBypassEnabled()) {
    return true;
  }

  const runtimeEnv = String(
    process.env.AZURE_FUNCTIONS_ENVIRONMENT || ""
  ).toLowerCase();

  // Local `func start` runs as Development; log emails instead of failing.
  if (runtimeEnv === "development" && !isGraphEmailConfigured()) {
    return true;
  }

  return false;
}

async function getGraphAccessToken() {
  const tenantId = process.env.GRAPH_TENANT_ID || process.env.AZURE_TENANT_ID;
  const clientId = process.env.GRAPH_CLIENT_ID || process.env.AZURE_CLIENT_ID;
  const clientSecret =
    process.env.GRAPH_CLIENT_SECRET || process.env.AZURE_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error(
      "Graph email is not configured (GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET)."
    );
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const response = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    throw new Error(
      data.error_description || data.error || "Unable to get Graph access token"
    );
  }

  return data.access_token;
}

async function sendViaGraph({ to, subject, text, html }) {
  const from =
    process.env.EMAIL_FROM ||
    process.env.GRAPH_SENDER_EMAIL ||
    process.env.WORKSHOP_EMAIL_FROM;

  if (!from) {
    throw new Error("EMAIL_FROM is not configured");
  }

  const token = await getGraphAccessToken();
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(from)}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject: String(subject || "").trim() || "Workshop notification",
          body: {
            contentType: html ? "HTML" : "Text",
            content: html || text || "",
          },
          toRecipients: [
            {
              emailAddress: {
                address: String(to || "").trim(),
              },
            },
          ],
        },
        saveToSentItems: false,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Graph sendMail failed (${response.status}): ${errorText || response.statusText}`
    );
  }

  return {
    provider: "graph",
    response: { status: response.status },
  };
}

/**
 * Send a workshop/login email.
 * Configure EMAIL_DEV_BYPASS=true for local logging, or Graph env vars for production.
 */
async function sendEmail({ to, subject, text, html }) {
  const recipient = String(to || "").trim();
  if (!recipient) {
    throw new Error("Email recipient is required");
  }

  if (shouldUseEmailBypass()) {
    console.log("[EMAIL BYPASS]", {
      to: recipient,
      subject,
      text,
    });
    return {
      provider: "mock",
      response: { bypass: true },
    };
  }

  const provider = String(process.env.EMAIL_PROVIDER || "graph").toLowerCase();
  if (provider === "graph") {
    if (!isGraphEmailConfigured()) {
      throw new Error(
        "Workshop email is not configured. Set EMAIL_FROM and Graph credentials (GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET), or EMAIL_DEV_BYPASS=true for local testing."
      );
    }
    return sendViaGraph({ to: recipient, subject, text, html });
  }

  throw new Error(`Unsupported EMAIL_PROVIDER: ${provider}`);
}

module.exports = {
  sendEmail,
  isEmailBypassEnabled,
  isGraphEmailConfigured,
  shouldUseEmailBypass,
};
