const DLT_OTP_TEMPLATE =
  "Your verification code is {var}. It is valid for {var} minutes. Please do not share this code with anyone. - Team KNAV Business Solutions Private Limited.";

const DLT_VARIABLE_MAX_LENGTH = 30;

function truncate(value, max = DLT_VARIABLE_MAX_LENGTH) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }
  return text.length <= max ? text : text.slice(0, max);
}

function buildVerificationCode(existingPassword) {
  const digits = String(existingPassword || "").replace(/\D/g, "");

  if (digits.length >= 4 && digits.length <= 8) {
    return digits;
  }

  return String(Math.floor(100000 + Math.random() * 900000));
}

function buildValidityMinutes() {
  const digits = String(process.env.WORKSHOP_SMS_VALID_MINUTES || "30").replace(
    /\D/g,
    ""
  );
  return digits || "30";
}

function applySequentialTemplate(template, variableNames, values) {
  let index = 0;
  return template.replace(/\{var\}/gi, () => {
    const key = variableNames[index];
    index += 1;
    return key ? values[key] ?? "" : "";
  });
}

function generateLoginOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function buildWorkshopSmsMessage({ verificationCode }) {
  const template = process.env.WORKSHOP_SMS_TEMPLATE || DLT_OTP_TEMPLATE;
  const variableNames = (process.env.WORKSHOP_SMS_VARIABLES || "code,minutes")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const values = {
    code: truncate(String(verificationCode || "").replace(/\D/g, ""), 8),
    minutes: truncate(buildValidityMinutes(), 3),
  };

  if (!values.code) {
    throw new Error("Verification code is required for OTP SMS template");
  }

  return applySequentialTemplate(template, variableNames, values);
}

module.exports = {
  DLT_OTP_TEMPLATE,
  buildVerificationCode,
  generateLoginOtp,
  buildWorkshopSmsMessage,
};
