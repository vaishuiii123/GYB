const {
  buildUserResponse,
  parsePhoneInput,
  getParticipantLoginContext,
  clearParticipantOtp,
} = require("../shared/participantAuth");

module.exports = async function (context, req) {
  try {
    const { phoneNo, phone, otp, otpCode } = req.body || {};
    const rawPhone = phoneNo || phone;
    const submittedOtp = String(otp || otpCode || "").trim();

    const phoneResult = parsePhoneInput(rawPhone);

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

    if (!submittedOtp) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "OTP is required.",
        },
      };
      return;
    }

    const loginContext = await getParticipantLoginContext(
      phoneResult.normalizedPhone
    );

    if (!loginContext) {
      context.res = {
        status: 401,
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

    const { participant, organizationId, orgName } = loginContext;
    const storedOtp = String(participant.OtpCode || "").trim();
    const expiresAt = participant.OtpExpiresAt
      ? new Date(participant.OtpExpiresAt)
      : null;

    if (!storedOtp || !expiresAt || Number.isNaN(expiresAt.getTime())) {
      context.res = {
        status: 401,
        body: {
          success: false,
          message: "OTP expired or not requested. Please request a new OTP.",
        },
      };
      return;
    }

    if (expiresAt.getTime() < Date.now()) {
      context.res = {
        status: 401,
        body: {
          success: false,
          message: "OTP has expired. Please request a new OTP.",
        },
      };
      return;
    }

    if (storedOtp !== submittedOtp) {
      context.res = {
        status: 401,
        body: {
          success: false,
          message: "Invalid OTP.",
        },
      };
      return;
    }

    await clearParticipantOtp(participant.rowKey);

    context.res = {
      status: 200,
      body: {
        success: true,
        user: buildUserResponse(participant, orgName, organizationId),
      },
    };
  } catch (error) {
    context.log(error);

    context.res = {
      status: 500,
      body: {
        success: false,
        error: error.message,
      },
    };
  }
};
