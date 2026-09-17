const {
  buildUserResponse,
  getParticipantLoginContextByUsername,
} = require("../shared/participantAuth");

module.exports = async function (context, req) {
  try {
    const { username, password } = req.body || {};
    const submittedUsername = String(username || "").trim();
    const submittedPassword = String(password || "");

    if (!submittedUsername || !submittedPassword) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "Username and password are required.",
        },
      };
      return;
    }

    const loginContext = await getParticipantLoginContextByUsername(
      submittedUsername
    );

    if (!loginContext) {
      context.res = {
        status: 401,
        body: {
          success: false,
          message: "Invalid username or password.",
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

    const storedPassword = String(loginContext.participant.Password || "");

    if (!storedPassword || storedPassword !== submittedPassword) {
      context.res = {
        status: 401,
        body: {
          success: false,
          message: "Invalid username or password.",
        },
      };
      return;
    }

    const { participant, organizationId, orgName } = loginContext;
    const user = buildUserResponse(participant, orgName, organizationId);
    const smsBypass =
      String(process.env.SMS_DEV_BYPASS || "").toLowerCase() === "true" ||
      String(process.env.SMS_PROVIDER || "").toLowerCase() === "mock";

    context.res = {
      status: 200,
      body: {
        success: true,
        // Local/dev: skip SMS OTP when bypass is enabled.
        skipOtp: smsBypass,
        user,
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
