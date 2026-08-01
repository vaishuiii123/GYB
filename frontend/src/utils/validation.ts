const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Accepts 10–15 digits; allows spaces, dashes, parentheses, and optional leading + */
export function normalizePhone(value: string) {
  return String(value || "").replace(/[^\d+]/g, "");
}

export function isValidEmail(value: string) {
  const email = String(value || "").trim();
  return EMAIL_REGEX.test(email);
}

export function isValidPhone(value: string) {
  const raw = String(value || "").trim();
  if (!raw) {
    return false;
  }

  const digits = raw.replace(/\D/g, "");

  // Local 10-digit mobile, or international 11–15 digits (E.164)
  if (digits.length === 10) {
    return /^[6-9]\d{9}$/.test(digits);
  }

  return digits.length >= 11 && digits.length <= 15;
}

export function getEmailError(value: string) {
  if (!String(value || "").trim()) {
    return "Email is required.";
  }
  if (!isValidEmail(value)) {
    return "Enter a valid email address.";
  }
  return "";
}

export function getPhoneError(value: string) {
  if (!String(value || "").trim()) {
    return "Phone number is required.";
  }
  if (!isValidPhone(value)) {
    return "Enter a valid phone number (10-digit mobile or international).";
  }
  return "";
}
