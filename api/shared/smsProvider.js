const https = require("https");
const { URL } = require("url");

function normalizeBulkSmsLinkUrl(apiUrl) {
  if (!apiUrl.includes("bulksmslink.in")) {
    return apiUrl;
  }

  // Azure Functions block outbound HTTP (port 80). BulkSMSLink has a bad cert
  // on HTTPS, so we allow insecure TLS instead of downgrading to HTTP.
  if (apiUrl.startsWith("http://")) {
    return apiUrl.replace(/^http:\/\//, "https://");
  }

  return apiUrl;
}

function postBulkSmsLink(apiUrl, bodyString) {
  return new Promise((resolve, reject) => {
    const url = new URL(apiUrl);
    const request = https.request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path: `${url.pathname}${url.search}`,
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(bodyString),
        },
        rejectUnauthorized: false,
        timeout: 30000,
      },
      (response) => {
        let raw = "";
        response.on("data", (chunk) => {
          raw += chunk;
        });
        response.on("end", () => {
          resolve({
            ok: response.statusCode >= 200 && response.statusCode < 300,
            status: response.statusCode,
            text: async () => raw,
          });
        });
      }
    );

    request.on("error", reject);
    request.on("timeout", () => {
      request.destroy(new Error("BulkSMSLink request timed out"));
    });
    request.write(bodyString);
    request.end();
  });
}

function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) {
    return "";
  }
  if (digits.length === 10) {
    return digits;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }
  return digits;
}

async function sendViaFast2Sms(phone, message) {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) {
    throw new Error("FAST2SMS_API_KEY is not configured");
  }

  const mobile = normalizePhone(phone);
  const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
    method: "POST",
    headers: {
      authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      route: "q",
      message,
      language: "english",
      numbers: mobile,
    }),
  });

  const data = await response.json();
  if (!response.ok || data.return === false) {
    throw new Error(data.message || "Fast2SMS request failed");
  }

  return { provider: "fast2sms", response: data };
}

async function sendViaMsg91(phone, message) {
  const authKey = process.env.MSG91_AUTH_KEY;
  const senderId = process.env.MSG91_SENDER_ID || "KNAVBS";

  if (!authKey) {
    throw new Error("MSG91_AUTH_KEY is not configured");
  }

  const mobile = normalizePhone(phone);
  const url =
    "https://api.msg91.com/api/sendhttp.php?" +
    new URLSearchParams({
      authkey: authKey,
      mobiles: `91${mobile}`,
      message,
      sender: senderId,
      route: "4",
      country: "91",
    }).toString();

  const response = await fetch(url);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(text || "MSG91 request failed");
  }

  return { provider: "msg91", response: text };
}

async function sendViaBulkSmsLink(phone, message, templateId) {
  let apiUrl = process.env.BULKSMSLINK_API_URL;
  const username = process.env.BULKSMSLINK_USERNAME;
  const apiKey = process.env.BULKSMSLINK_API_KEY;
  const senderId = process.env.BULKSMSLINK_SENDER_ID || "KNAVBS";
  const route = process.env.BULKSMSLINK_ROUTE || "TRANS";
  const dltTemplateId =
    templateId || process.env.BULKSMSLINK_TEMPLATE_ID || "";
  const entityId = process.env.BULKSMSLINK_ENTITY_ID || "";
  const telemarketerDeliveryId =
    process.env.BULKSMSLINK_TELEMARKETER_DELIVERY_ID || "";

  if (!apiUrl || apiUrl.includes("your-domain")) {
    throw new Error(
      "BULKSMSLINK_API_URL is not configured. Set the URL from BulkSMSLink API docs."
    );
  }

  apiUrl = normalizeBulkSmsLinkUrl(apiUrl);

  if (!username || !apiKey) {
    throw new Error(
      "BULKSMSLINK_USERNAME and BULKSMSLINK_API_KEY are required"
    );
  }

  if (!dltTemplateId) {
    throw new Error(
      "BULKSMSLINK_TEMPLATE_ID is required (Content Template ID from DLT Management > My Draft, not Telemarketer Delivery ID)"
    );
  }

  if (!entityId) {
    throw new Error(
      "BULKSMSLINK_ENTITY_ID is required for DLT SMS (Entity ID from DLT Chain)"
    );
  }

  if (!telemarketerDeliveryId) {
    throw new Error(
      "BULKSMSLINK_TELEMARKETER_DELIVERY_ID is required (from DLT Management > DLT Chain)"
    );
  }

  const mobile = normalizePhone(phone);
  if (!mobile || mobile.length !== 10) {
    throw new Error("Invalid mobile number for SMS");
  }

  const body = new URLSearchParams({
    username,
    apikey: apiKey,
    apirequest: "Text",
    sender: senderId,
    route,
    format: "JSON",
    message,
    mobile,
    TemplateID: dltTemplateId,
    EntityID: entityId,
    TelemarketerID: telemarketerDeliveryId,
  });

  let response;
  try {
    const bodyString = body.toString();

    if (apiUrl.startsWith("https://") && apiUrl.includes("bulksmslink.in")) {
      response = await postBulkSmsLink(apiUrl, bodyString);
    } else {
      response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: bodyString,
      });
    }
  } catch (error) {
    const cause = error.cause?.message || error.cause?.code || "";
    throw new Error(
      cause
        ? `BulkSMSLink request failed: ${error.message} (${cause})`
        : `BulkSMSLink request failed: ${error.message}`
    );
  }

  const raw = await response.text();
  let parsed = null;

  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    throw new Error(raw || "BulkSMSLink request failed");
  }

  if (parsed) {
    const status = String(
      parsed.status || parsed.Status || parsed.success || parsed.Success || ""
    ).toLowerCase();

    const statusCode = String(
      parsed.statusCode || parsed.StatusCode || parsed.code || parsed.Code || ""
    );

    const reason = String(
      parsed.reason || parsed.Reason || parsed.message || parsed.Message || ""
    ).toLowerCase();

    if (
      status === "error" ||
      status === "failed" ||
      status === "false" ||
      parsed.error ||
      parsed.Error ||
      (statusCode && !["900", "200", "0"].includes(statusCode)) ||
      reason.includes("fail") ||
      reason.includes("invalid") ||
      reason.includes("reject") ||
      reason.includes("blocked")
    ) {
      const providerMessage =
        parsed.message ||
        parsed.Message ||
        parsed.reason ||
        parsed.Reason ||
        parsed.error ||
        parsed.Error ||
        raw;

      if (String(providerMessage).toLowerCase().includes("ip blocked")) {
        throw new Error(
          `${providerMessage}. BulkSMSLink is blocking this machine's public IP. For local login set SMS_DEV_BYPASS=true in api/local.settings.json (Values), or whitelist the IP from GET /api/get-outbound-ip in BulkSMSLink.`
        );
      }

      throw new Error(providerMessage);
    }
  }

  return { provider: "bulksmslink", response: parsed || raw };
}

async function sendViaMock(phone, message) {
  const mobile = normalizePhone(phone);
  console.log(
    `[SMS_DEV_BYPASS] Skipping real SMS provider. phone=${mobile} message=${message}`
  );
  return {
    provider: "mock",
    response: {
      status: "success",
      message: "SMS skipped in local/dev mode. Check Functions logs for OTP.",
    },
  };
}

async function sendSms(phone, message, options = {}) {
  const provider = (process.env.SMS_PROVIDER || "bulksmslink").toLowerCase();
  const bypass =
    String(process.env.SMS_DEV_BYPASS || "").toLowerCase() === "true" ||
    provider === "mock";

  if (bypass) {
    return sendViaMock(phone, message);
  }

  switch (provider) {
    case "fast2sms":
      return sendViaFast2Sms(phone, message);
    case "msg91":
      return sendViaMsg91(phone, message);
    case "bulksmslink":
    case "bulk-sms-link":
      return sendViaBulkSmsLink(phone, message, options.templateId);
    default:
      throw new Error(`Unsupported SMS provider: ${provider}`);
  }
}

module.exports = {
  normalizePhone,
  sendSms,
};
