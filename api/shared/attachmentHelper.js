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
  ".doc",
  ".docx",
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
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

function buildContentDisposition(fileName, inline = false) {
  const safe =
    String(fileName || "attachment").replace(/[<>:"/\\|?*\x00-\x1f]+/g, "_") ||
    "attachment";
  const mode = inline ? "inline" : "attachment";
  return `${mode}; filename="${safe}"`;
}

function normalizeAttachmentItem(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const blobPath = String(item.blobPath || "").trim();
  const fileName = String(item.fileName || item.name || "").trim();
  if (!blobPath && !fileName) {
    return null;
  }

  return {
    id: String(item.id || blobPath || fileName),
    fileName: fileName || "attachment",
    blobPath,
    contentType: String(item.contentType || "application/octet-stream"),
    size: Number(item.size || 0),
  };
}

function normalizeAttachmentList(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map(normalizeAttachmentItem).filter(Boolean);
  }

  if (typeof value === "string") {
    try {
      return normalizeAttachmentList(JSON.parse(value));
    } catch {
      return [];
    }
  }

  const single = normalizeAttachmentItem(value);
  return single ? [single] : [];
}

function attachmentsFromAnswerEntity(entity) {
  const fromJson = normalizeAttachmentList(entity?.AttachmentsJson);
  if (fromJson.length > 0) {
    return fromJson;
  }

  const blobPath = String(entity?.AttachmentBlobPath || "").trim();
  if (!blobPath) {
    return [];
  }

  return [
    {
      id: blobPath,
      fileName: String(entity.AttachmentName || "attachment"),
      blobPath,
      contentType: String(
        entity.AttachmentContentType || "application/octet-stream"
      ),
      size: Number(entity.AttachmentSize || 0),
    },
  ];
}

function serializeAttachmentsJson(list) {
  return JSON.stringify(normalizeAttachmentList(list));
}

module.exports = {
  normalizeAttachmentsApplicable,
  isAttachmentsApplicable,
  ALLOWED_ATTACHMENT_EXTENSIONS,
  MAX_ATTACHMENT_BYTES,
  getFileExtension,
  isAllowedAttachmentFile,
  sanitizeFileName,
  buildContentDisposition,
  normalizeAttachmentItem,
  normalizeAttachmentList,
  attachmentsFromAnswerEntity,
  serializeAttachmentsJson,
};
