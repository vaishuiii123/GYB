export const ATTACHMENT_ACCEPT =
  ".png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.pdf";

export const ATTACHMENT_HINT =
  "Images, Word, Excel, or PDF (max 10 MB)";

const ALLOWED_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".pdf",
]);

export type AttachmentKind = "image" | "pdf" | "doc" | "excel" | "other";

export function getFileExtension(fileName: string): string {
  const name = String(fileName || "")
    .trim()
    .toLowerCase();
  const index = name.lastIndexOf(".");
  if (index < 0) {
    return "";
  }
  return name.slice(index);
}

export function getAttachmentKind(
  fileName: string,
  contentType = ""
): AttachmentKind {
  const ext = getFileExtension(fileName);
  const type = String(contentType || "").toLowerCase();

  if (
    [".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext) ||
    type.startsWith("image/")
  ) {
    return "image";
  }
  if (ext === ".pdf" || type.includes("pdf")) {
    return "pdf";
  }
  if (
    [".doc", ".docx"].includes(ext) ||
    type.includes("msword") ||
    type.includes("wordprocessingml")
  ) {
    return "doc";
  }
  if (
    [".xls", ".xlsx"].includes(ext) ||
    type.includes("sheet") ||
    type.includes("excel")
  ) {
    return "excel";
  }
  return "other";
}

export function isAllowedAttachmentFile(
  fileName: string,
  contentType = ""
): boolean {
  const ext = getFileExtension(fileName);
  if (!ALLOWED_EXTENSIONS.has(ext)) {
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

export function canInlinePreview(kind: AttachmentKind): boolean {
  return (
    kind === "image" ||
    kind === "pdf" ||
    kind === "doc" ||
    kind === "excel"
  );
}

export function normalizeAttachmentList(
  value: unknown
): Array<{
  id?: string;
  fileName: string;
  blobPath?: string;
  contentType?: string;
  size?: number;
}> {
  if (!value) {
    return [];
  }

  const asItem = (item: any) => {
    if (!item || typeof item !== "object") {
      return null;
    }
    const fileName = String(item.fileName || item.name || "").trim();
    const blobPath = String(item.blobPath || "").trim();
    if (!fileName && !blobPath) {
      return null;
    }
    return {
      id: String(item.id || blobPath || fileName),
      fileName: fileName || "attachment",
      blobPath: blobPath || undefined,
      contentType: String(item.contentType || "application/octet-stream"),
      size: Number(item.size || 0),
    };
  };

  if (Array.isArray(value)) {
    return value.map(asItem).filter(Boolean) as Array<{
      id?: string;
      fileName: string;
      blobPath?: string;
      contentType?: string;
      size?: number;
    }>;
  }

  const single = asItem(value);
  return single ? [single] : [];
}

export function withInlineDisposition(url: string): string {
  if (!url || url === "-") {
    return url;
  }
  const separator = url.includes("?") ? "&" : "?";
  if (/[?&]inline=/.test(url)) {
    return url;
  }
  return `${url}${separator}inline=1`;
}

export function withAttachmentDisposition(url: string): string {
  if (!url || url === "-") {
    return url;
  }
  const separator = url.includes("?") ? "&" : "?";
  if (/[?&]inline=/.test(url)) {
    return url.replace(/([?&])inline=\d+/g, "$1inline=0");
  }
  return `${url}${separator}inline=0`;
}
