module.exports = async function (context) {
  try {
    const response = await fetch("https://api.ipify.org?format=json");
    const data = await response.json();

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: {
        success: true,
        outboundIp: data.ip,
        note: "Whitelist this IP in BulkSMSLink. If OTP fails later, the IP may have changed (common on managed Static Web Apps).",
      },
    };
  } catch (error) {
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: {
        success: false,
        message: error.message || "Unable to detect outbound IP.",
      },
    };
  }
};
