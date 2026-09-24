import { useEffect, useState } from "react";
import { Download, ExternalLink, X } from "lucide-react";
import {
  canInlinePreview,
  getAttachmentKind,
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

export default function AttachmentPreviewModal({ target, onClose }: Props) {
  const [objectUrl, setObjectUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const kind: AttachmentKind = target
    ? getAttachmentKind(target.fileName, target.contentType)
    : "other";
  const inlineCapable = canInlinePreview(kind);

  useEffect(() => {
    if (!target) {
      setObjectUrl("");
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

      try {
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

        if (!inlineCapable) {
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
  }, [target, inlineCapable]);

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
    <div className="attachment-preview-backdrop" role="presentation">
      <div
        className="attachment-preview-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Preview ${target.fileName}`}
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

          {!loading && !error && !inlineCapable ? (
            <div className="attachment-preview-office">
              <p>
                Browser preview is not available for{" "}
                {kind === "excel" ? "Excel" : "Word"} files.
              </p>
              <p>Download the file to open it in the desktop app.</p>
            </div>
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
