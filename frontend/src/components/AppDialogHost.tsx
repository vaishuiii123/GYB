import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  XCircle,
} from "lucide-react";
import {
  bindAppDialog,
  dismissToast,
  resolveConfirm,
  resolveUnsaved,
  type AppConfirmRequest,
  type AppToastItem,
  type AppUnsavedRequest,
} from "../utils/appDialog";
import "../styles/AppDialog.css";

function toastIcon(variant: AppToastItem["variant"]) {
  if (variant === "success") return CheckCircle2;
  if (variant === "error") return XCircle;
  if (variant === "warning") return AlertTriangle;
  return Info;
}

export default function AppDialogHost() {
  const [toasts, setToasts] = useState<AppToastItem[]>([]);
  const [confirm, setConfirm] = useState<AppConfirmRequest | null>(null);
  const [unsaved, setUnsaved] = useState<AppUnsavedRequest | null>(null);

  useEffect(() => {
    return bindAppDialog((event) => {
      setToasts(event.toasts);
      setConfirm(event.confirm);
      setUnsaved(event.unsaved);
    });
  }, []);

  useEffect(() => {
    if (!confirm && !unsaved) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      if (unsaved) {
        resolveUnsaved(unsaved.id, "cancel");
        return;
      }
      if (confirm) {
        resolveConfirm(confirm.id, false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirm, unsaved]);

  return (
    <>
      <div className="app-toast-stack" aria-live="polite" aria-relevant="additions">
        {toasts.map((toast) => {
          const Icon = toastIcon(toast.variant);

          return (
            <div
              key={toast.id}
              className={`app-toast app-toast-${toast.variant}`}
              role="status"
            >
              <span className="app-toast-icon" aria-hidden>
                <Icon size={18} strokeWidth={2.2} />
              </span>
              <p className="app-toast-message">{toast.message}</p>
              <button
                type="button"
                className="app-toast-close"
                aria-label="Dismiss"
                onClick={() => dismissToast(toast.id)}
              >
                <X size={16} strokeWidth={2.2} />
              </button>
            </div>
          );
        })}
      </div>

      {confirm ? (
        <div
          className="app-confirm-overlay"
          role="presentation"
          onClick={() => resolveConfirm(confirm.id, false)}
        >
          <div
            className={`app-confirm-card app-confirm-${confirm.variant || "confirm"}`}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`app-confirm-title-${confirm.id}`}
            aria-describedby={`app-confirm-desc-${confirm.id}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="app-confirm-icon" aria-hidden>
              <AlertTriangle size={22} strokeWidth={2.2} />
            </div>

            <h3 id={`app-confirm-title-${confirm.id}`}>
              {confirm.title || "Please confirm"}
            </h3>
            <p id={`app-confirm-desc-${confirm.id}`}>{confirm.message}</p>

            <div className="app-confirm-actions">
              <button
                type="button"
                className="app-confirm-cancel"
                onClick={() => resolveConfirm(confirm.id, false)}
              >
                {confirm.cancelLabel || "Cancel"}
              </button>
              <button
                type="button"
                className="app-confirm-ok"
                onClick={() => resolveConfirm(confirm.id, true)}
              >
                {confirm.confirmLabel || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {unsaved ? (
        <div
          className="app-confirm-overlay"
          role="presentation"
          onClick={() => resolveUnsaved(unsaved.id, "cancel")}
        >
          <div
            className="app-confirm-card app-confirm-warning"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`app-unsaved-title-${unsaved.id}`}
            aria-describedby={`app-unsaved-desc-${unsaved.id}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="app-confirm-icon" aria-hidden>
              <AlertTriangle size={22} strokeWidth={2.2} />
            </div>

            <h3 id={`app-unsaved-title-${unsaved.id}`}>
              {unsaved.title || "Unsaved changes"}
            </h3>
            <p id={`app-unsaved-desc-${unsaved.id}`}>{unsaved.message}</p>

            <div className="app-confirm-actions app-confirm-actions-triple">
              <button
                type="button"
                className="app-confirm-cancel"
                onClick={() => resolveUnsaved(unsaved.id, "cancel")}
              >
                Cancel
              </button>
              <button
                type="button"
                className="app-confirm-discard"
                onClick={() => resolveUnsaved(unsaved.id, "discard")}
              >
                Discard
              </button>
              <button
                type="button"
                className="app-confirm-ok"
                onClick={() => resolveUnsaved(unsaved.id, "save")}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
