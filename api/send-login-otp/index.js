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

module.exports = async function (context, req) {
  try {
    const { phoneNo, phone } = req.body || {};
    const phoneResult = parsePhoneInput(phoneNo || phone);

    if (!phoneResult.valid) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: phoneResult.message,
        },
      };
      return;
    }

    const loginContext = await getParticipantLoginContext(
      phoneResult.normalizedPhone
    );

    if (!loginContext) {
      context.res = {
        status: 404,
        body: {
          success: false,
          message: "Phone number not found.",
        },
      };
      return;
    }

    if (loginContext.missingOrganization) {
      context.res = {
        status: 401,
        body: {
          success: false,
          message: "You are not assigned to an organization.",
        },
      };
      return;
    }

    const otp = buildVerificationCode("");
    const validityMinutes = Number(getOtpValidityMinutes()) || 30;
    const expiresAt = new Date(Date.now() + validityMinutes * 60 * 1000);

    await saveParticipantOtp(loginContext.participant.rowKey, otp, expiresAt);

    const message = buildWorkshopSmsMessage({ verificationCode: otp });

    context.log("Login OTP SMS:", message);

    await sendSms(phoneResult.normalizedPhone, message);

    context.res = {
      status: 200,
      body: {
        success: true,
        message: "OTP sent to your mobile number.",
        expiresInMinutes: validityMinutes,
      },
    };
  } catch (error) {
    context.log("Error in send-login-otp:", error);

    context.res = {
      status: 500,
      body: {
        success: false,
        message: error.message || "Failed to send OTP.",
      },
    };
  }
};
