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

  // BulkSMSLink's login endpoint currently serves an invalid SSL certificate.
  // Node fetch rejects HTTPS; HTTP works for the same API path.
  if (apiUrl.includes("bulksmslink.in") && apiUrl.startsWith("https://")) {
    apiUrl = apiUrl.replace(/^https:\/\//, "http://");
  }

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
    response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });
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
      reason.includes("reject")
    ) {
      throw new Error(
        parsed.message ||
          parsed.Message ||
          parsed.reason ||
          parsed.Reason ||
          parsed.error ||
          parsed.Error ||
          raw
      );
    }
  }

  return { provider: "bulksmslink", response: parsed || raw };
}

async function sendSms(phone, message, options = {}) {
  const provider = (process.env.SMS_PROVIDER || "bulksmslink").toLowerCase();

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
