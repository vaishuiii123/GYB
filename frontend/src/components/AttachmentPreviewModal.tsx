import { useEffect, useState } from "react";
import { Download, ExternalLink, X } from "lucide-react";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import {
  canInlinePreview,
  getAttachmentKind,
  getFileExtension,
  withAttachmentDisposition,
  withInlineDisposition,
  type AttachmentKind,
} from "../utils/attachmentTypes";
import "../styles/AttachmentPreview.css";

export type AttachmentPreviewTarget = {
  url?: string;
  file?: File;
  fileName: string;
  contentType?: string;
};

type Props = {
  target: AttachmentPreviewTarget | null;
  onClose: () => void;
};

async function loadArrayBuffer(target: AttachmentPreviewTarget): Promise<ArrayBuffer> {
  if (target.file) {
    return target.file.arrayBuffer();
  }
  if (!target.url) {
    throw new Error("No attachment file is available to preview.");
  }
  const response = await fetch(withInlineDisposition(target.url));
  if (!response.ok) {
    throw new Error("Unable to load attachment for preview.");
  }
  return response.arrayBuffer();
}

function toUint8Array(buffer: ArrayBuffer): Uint8Array {
  return new Uint8Array(buffer);
}

function isExcelBinary(bytes: Uint8Array): boolean {
  if (bytes.length < 4) {
    return false;
  }
  // XLSX / XLSM are ZIP packages (PK..)
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b;
  // Legacy XLS is OLE Compound File (D0 CF 11 E0)
  const isOle =
    bytes[0] === 0xd0 &&
    bytes[1] === 0xcf &&
    bytes[2] === 0x11 &&
    bytes[3] === 0xe0;
  return isZip || isOle;
}

function sheetPlainText(sheet: XLSX.WorkSheet): string {
  const rows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(
    sheet,
    { header: 1, defval: "", raw: false }
  );
  return rows
    .map((row) =>
      (Array.isArray(row) ? row : [])
        .map((cell) => String(cell ?? "").trim())
        .filter(Boolean)
        .join(" ")
    )
    .filter(Boolean)
    .join("\n");
}

/** Detect classic binary→UTF-8 mojibake (e.g. Mandarin garbage from raw xlsx bytes). */
function looksLikeBinaryMojibake(text: string): boolean {
  const sample = text.slice(0, 800);
  if (!sample.trim()) {
    return false;
  }
  const cjk = (sample.match(/[\u3400-\u9fff]/g) || []).length;
  const latin = (sample.match(/[A-Za-z0-9]/g) || []).length;
  return cjk > 24 && cjk > latin * 2;
}

export default function AttachmentPreviewModal({ target, onClose }: Props) {
  const [objectUrl, setObjectUrl] = useState("");
  const [htmlPreview, setHtmlPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const kind: AttachmentKind = target
    ? getAttachmentKind(target.fileName, target.contentType)
    : "other";
  const inlineCapable = canInlinePreview(kind);

  useEffect(() => {
    if (!target) {
      setObjectUrl("");
      setHtmlPreview("");
      setLoading(false);
      setError("");
      return;
    }

    let revoked = false;
    let createdUrl = "";

    const load = async () => {
      setLoading(true);
      setError("");
      setObjectUrl("");
      setHtmlPreview("");

      try {
        if (kind === "image" || kind === "pdf") {
          if (target.file) {
            createdUrl = URL.createObjectURL(target.file);
            if (!revoked) {
              setObjectUrl(createdUrl);
            }
            return;
          }

          if (!target.url) {
            setError("No attachment file is available to preview.");
            return;
          }

          const response = await fetch(withInlineDisposition(target.url));
          if (!response.ok) {
            throw new Error("Unable to load attachment for preview.");
          }

          const blob = await response.blob();
          createdUrl = URL.createObjectURL(blob);
          if (!revoked) {
            setObjectUrl(createdUrl);
          }
          return;
        }

        if (kind === "doc") {
          const ext = getFileExtension(target.fileName);
          if (ext === ".doc") {
            setError(
              "Preview for legacy .doc files is limited. Convert to .docx, or download to open."
            );
            return;
          }
          const buffer = await loadArrayBuffer(target);
          const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
          if (!revoked) {
            setHtmlPreview(result.value || "<p>(Empty document)</p>");
          }
          return;
        }

        if (kind === "excel") {
          const buffer = await loadArrayBuffer(target);
          const bytes = toUint8Array(buffer);
          if (!isExcelBinary(bytes)) {
            setError(
              "This Excel file could not be previewed (file data looks corrupted). Please use Open / Download."
            );
            return;
          }
          // SheetJS expects a Uint8Array for type:"array" — passing ArrayBuffer
          // can mis-parse the workbook and render binary garbage as text.
          const workbook = XLSX.read(bytes, {
            type: "array",
            cellDates: true,
          });
          const firstSheet = workbook.SheetNames[0];
          if (!firstSheet) {
            setError("This Excel file has no sheets to preview.");
            return;
          }
          const sheet = workbook.Sheets[firstSheet];
          const plain = sheetPlainText(sheet);
          if (!plain) {
            setError("This Excel sheet is empty.");
            return;
          }
          if (looksLikeBinaryMojibake(plain)) {
            setError(
              "Excel preview could not be rendered correctly. Please use Open / Download to view the workbook."
            );
            return;
          }
          const html = XLSX.utils.sheet_to_html(sheet);
          if (!revoked) {
            setHtmlPreview(html || "<p>(Empty sheet)</p>");
          }
          return;
        }

        setError("Preview is not available for this file type.");
      } catch (err) {
        if (!revoked) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load attachment for preview."
          );
        }
      } finally {
        if (!revoked) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      revoked = true;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [target, kind, inlineCapable]);

  if (!target) {
    return null;
  }

  const downloadUrl = target.url
    ? withAttachmentDisposition(target.url)
    : "";

  const openDownload = () => {
    if (target.file) {
      const url = URL.createObjectURL(target.file);
      const link = document.createElement("a");
      link.href = url;
      link.download = target.fileName;
      link.click();
      URL.revokeObjectURL(url);
      return;
    }
    if (downloadUrl) {
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="attachment-preview-backdrop" role="presentation" onClick={onClose}>
      <div
        className="attachment-preview-modal is-large"
        role="dialog"
        aria-modal="true"
        aria-label={`Preview ${target.fileName}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="attachment-preview-header">
          <div>
            <p className="attachment-preview-kicker">Attachment preview</p>
            <h2>{target.fileName}</h2>
          </div>
          <button
            type="button"
            className="attachment-preview-close"
            onClick={onClose}
            aria-label="Close preview"
          >
            <X size={18} strokeWidth={2.4} />
          </button>
        </div>

        <div className="attachment-preview-body">
          {loading ? (
            <p className="attachment-preview-status">Loading preview...</p>
          ) : null}

          {!loading && error ? (
            <p className="attachment-preview-status is-error">{error}</p>
          ) : null}

          {!loading && !error && kind === "image" && objectUrl ? (
            <img
              className="attachment-preview-image"
              src={objectUrl}
              alt={target.fileName}
            />
          ) : null}

          {!loading && !error && kind === "pdf" && objectUrl ? (
            <iframe
              className="attachment-preview-frame"
              title={target.fileName}
              src={objectUrl}
            />
          ) : null}

          {!loading && !error && htmlPreview ? (
            <div
              className={`attachment-preview-html ${
                kind === "excel" ? "is-excel" : "is-doc"
              }`}
              dangerouslySetInnerHTML={{ __html: htmlPreview }}
            />
          ) : null}
        </div>

        <div className="attachment-preview-footer">
          <button
            type="button"
            className="user-btn-secondary"
            onClick={onClose}
          >
            Close
          </button>
          <button
            type="button"
            className="user-btn-primary"
            onClick={openDownload}
          >
            {inlineCapable ? (
              <ExternalLink size={14} strokeWidth={2.2} aria-hidden />
            ) : (
              <Download size={14} strokeWidth={2.2} aria-hidden />
            )}
            {inlineCapable ? "Open / Download" : "Download"}
          </button>
        </div>
      </div>
    </div>
  );
}
