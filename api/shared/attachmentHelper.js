function normalizeAttachmentsApplicable(value) {
  const raw = String(value || "")
    .trim()
    .toLowerCase();

  if (["y", "yes", "true", "1"].includes(raw)) {
    return "Y";
  }

  return "N";
}

function isAttachmentsApplicable(value) {
  return normalizeAttachmentsApplicable(value) === "Y";
}

const ALLOWED_ATTACHMENT_EXTENSIONS = new Set([
  ".xlsx",
  ".xls",
  ".csv",
  ".doc",
  ".docx",
  ".pdf",
  ".ppt",
  ".pptx",
  ".txt",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".bmp",
]);

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB

function getFileExtension(fileName) {
  const name = String(fileName || "").trim().toLowerCase();
  const index = name.lastIndexOf(".");
  if (index < 0) {
    return "";
  }
  return name.slice(index);
}

function isAllowedAttachmentFile(fileName, contentType) {
  const extension = getFileExtension(fileName);
  if (!ALLOWED_ATTACHMENT_EXTENSIONS.has(extension)) {
    return false;
  }

  const type = String(contentType || "").toLowerCase();
  if (!type) {
    return true;
  }

  return (
    type.startsWith("image/") ||
    type.includes("pdf") ||
    type.includes("sheet") ||
    type.includes("excel") ||
    type.includes("msword") ||
    type.includes("wordprocessingml") ||
    type.includes("presentation") ||
    type.includes("powerpoint") ||
    type.includes("csv") ||
    type.includes("text/plain") ||
    type === "application/octet-stream"
  );
}

function sanitizeFileName(fileName) {
  const base = String(fileName || "attachment")
    .replace(/[<>:"/\\|?*\x00-\x1f]+/g, "_")
    .replace(/\s+/g, "_")
    .trim();

  return base.slice(0, 180) || "attachment";
}

module.exports = {
  normalizeAttachmentsApplicable,
  isAttachmentsApplicable,
  ALLOWED_ATTACHMENT_EXTENSIONS,
  MAX_ATTACHMENT_BYTES,
  getFileExtension,
  isAllowedAttachmentFile,
  sanitizeFileName,
};
