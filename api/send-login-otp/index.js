const { sendSms } = require("../shared/smsProvider");
const {
  parsePhoneInput,
  getParticipantLoginContext,
  saveParticipantOtp,
  getOtpValidityMinutes,
} = require("../shared/participantAuth");
const {
  buildVerificationCode,
  buildWorkshopSmsMessage,
} = require("../shared/workshopSmsMessage");

function jsonResponse(status, body) {
  return {
    status,
    headers: { "Content-Type": "application/json" },
    body,
  };
}

module.exports = async function (context, req) {
  try {
    // Debug: check which IP the local backend sees
    context.log("Request IP:", req.headers?.["x-forwarded-for"]);
    context.log("X-Real-IP:", req.headers?.["x-real-ip"]);
    context.log("Client IP:", req.headers?.["client-ip"]);

    const { phoneNo, phone } = req.body || {};
    const phoneResult = parsePhoneInput(phoneNo || phone);

    if (!phoneResult.valid) {
      context.res = jsonResponse(400, {
        success: false,
        message: phoneResult.message,
      });
      return;
    }

    const loginContext = await getParticipantLoginContext(
      phoneResult.normalizedPhone
    );

    if (!loginContext) {
      context.res = jsonResponse(404, {
        success: false,
        message: "Phone number not found.",
      });
      return;
    }

    if (loginContext.missingOrganization) {
      context.res = jsonResponse(401, {
        success: false,
        message: "You are not assigned to an organization.",
      });
      return;
    }

    const otp = buildVerificationCode("");
    const validityMinutes = Number(getOtpValidityMinutes()) || 30;
    const expiresAt = new Date(Date.now() + validityMinutes * 60 * 1000);

    await saveParticipantOtp(loginContext.participant.rowKey, otp, expiresAt);

    const message = buildWorkshopSmsMessage({ verificationCode: otp });
    const smsBypass =
      String(process.env.SMS_DEV_BYPASS || "").toLowerCase() === "true" ||
      String(process.env.SMS_PROVIDER || "").toLowerCase() === "mock";

    context.log("Login OTP SMS:", message);
    if (smsBypass) {
      context.log(`[DEV] OTP for ${phoneResult.normalizedPhone}: ${otp}`);
    }

    await sendSms(phoneResult.normalizedPhone, message);

    context.res = jsonResponse(200, {
      success: true,
      message: smsBypass
        ? "OTP generated locally (SMS bypass). Check Functions console for the code."
        : "OTP sent to your mobile number.",
      expiresInMinutes: validityMinutes,
      ...(smsBypass ? { devOtp: otp } : {}),
    });
  } catch (error) {
    context.log("Error in send-login-otp:", error);

    context.res = jsonResponse(500, {
      success: false,
      message: error.message || "Failed to send OTP.",
    });
  }
};
