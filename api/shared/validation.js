const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value) {
  const email = String(value || "").trim();
  return EMAIL_REGEX.test(email);
}

function isValidPhone(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return false;
  }

  const digits = raw.replace(/\D/g, "");

  if (digits.length === 10) {
    return /^[6-9]\d{9}$/.test(digits);
  }

  return digits.length >= 11 && digits.length <= 15;
}

module.exports = {
  isValidEmail,
  isValidPhone,
};
