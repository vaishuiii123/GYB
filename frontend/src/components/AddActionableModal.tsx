import { useEffect, useState } from "react";
import { CalendarDays, MessageSquare, UserRound, X } from "lucide-react";
import { appAlert } from "../utils/appDialog";
import "./AddActionableModal.css";

export type AddActionablePreset = {
  participantId: string;
  workshopId: string;
  organizationId: string;
  categoryId: string;
  categoryName: string;
  categoryPath: string;
  participantLabel?: string;
  /** Admin Responses page may add actionables after workshop ends. */
  allowAfterEnd?: boolean;
};

type AddActionableModalProps = {
  open: boolean;
  preset: AddActionablePreset | null;
  canEdit?: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

const DESCRIPTION_MAX = 500;

export default function AddActionableModal({
  open,
  preset,
  canEdit = true,
  onClose,
  onSaved,
}: AddActionableModalProps) {
  const [description, setDescription] = useState("");
  const [timeline, setTimeline] = useState("");
  const [responsiblePersons, setResponsiblePersons] = useState("");
  const [comments, setComments] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }
    setDescription("");
    setTimeline("");
    setResponsiblePersons("");
    setComments("");
    setErrorMessage("");
    setSaving(false);
  }, [open, preset?.categoryId, preset?.participantId]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, saving]);

  if (!open || !preset) {
    return null;
  }

  const categoryLabel =
    preset.categoryName ||
    preset.categoryPath.split(">").pop()?.trim() ||
    "Category";

  const handleSave = async () => {
    if (!canEdit) {
      setErrorMessage("Editing is locked for this workshop.");
      return;
    }

    if (!description.trim()) {
      setErrorMessage("Description is required.");
      return;
    }
    if (!timeline.trim()) {
      setErrorMessage("Timeline is required.");
      return;
    }
    if (!responsiblePersons.trim()) {
      setErrorMessage("Person/s responsible is required.");
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");

      const response = await fetch("/api/save-actionable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: preset.participantId,
          workshopId: preset.workshopId,
          organizationId: preset.organizationId,
          categoryId: preset.categoryId,
          categoryName: preset.categoryName || categoryLabel,
          categoryPath: preset.categoryPath || categoryLabel,
          description: description.trim(),
          timeline: timeline.trim(),
          responsiblePersons: responsiblePersons.trim(),
          comments: comments.trim(),
          allowAfterEnd: Boolean(preset.allowAfterEnd),
        }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        setErrorMessage(
          result?.message || "Failed to save actionable item."
        );
        return;
      }

      appAlert("Actionable added successfully.", "success");
      onSaved?.();
      onClose();
    } catch (error) {
      console.error(error);
      setErrorMessage("Something went wrong while saving.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="add-act-overlay"
      role="presentation"
      onClick={() => {
        if (!saving) {
          onClose();
        }
      }}
    >
      <div
        className="add-act-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-act-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="add-act-header">
          <div>
            <h2 id="add-act-title">Add as Actionable</h2>
            <p>
              Category is set from the current question. Enter the remaining
              details below.
            </p>
          </div>
          <button
            type="button"
            className="add-act-close"
            aria-label="Close"
            disabled={saving}
            onClick={onClose}
          >
            <X size={18} strokeWidth={2.2} />
          </button>
        </header>

        <div className="add-act-body">
          {preset.participantLabel ? (
            <div className="add-act-field">
              <label>Participant</label>
              <div className="add-act-readonly">{preset.participantLabel}</div>
            </div>
          ) : null}

          <div className="add-act-field">
            <label>Category</label>
            <div className="add-act-readonly" title={preset.categoryPath}>
              {categoryLabel}
            </div>
          </div>

          <div className="add-act-field">
            <div className="add-act-label-row">
              <label htmlFor="add-act-description">Description</label>
              <span>
                {description.length}/{DESCRIPTION_MAX}
              </span>
            </div>
            <textarea
              id="add-act-description"
              value={description}
              maxLength={DESCRIPTION_MAX}
              rows={3}
              disabled={!canEdit || saving}
              placeholder="Describe the actionable item"
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div className="add-act-grid">
            <div className="add-act-field">
              <label htmlFor="add-act-timeline">Timeline</label>
              <div className="add-act-input-wrap">
                <CalendarDays size={16} strokeWidth={2.1} aria-hidden />
                <input
                  id="add-act-timeline"
                  type="date"
                  value={timeline}
                  disabled={!canEdit || saving}
                  onChange={(event) => setTimeline(event.target.value)}
                />
              </div>
            </div>

            <div className="add-act-field">
              <label htmlFor="add-act-responsible">Person/s Responsible</label>
              <div className="add-act-input-wrap">
                <UserRound size={16} strokeWidth={2.1} aria-hidden />
                <input
                  id="add-act-responsible"
                  type="text"
                  value={responsiblePersons}
                  disabled={!canEdit || saving}
                  placeholder="Name(s)"
                  onChange={(event) =>
                    setResponsiblePersons(event.target.value)
                  }
                />
              </div>
            </div>
          </div>

          <div className="add-act-field">
            <label htmlFor="add-act-comments">Comments</label>
            <div className="add-act-input-wrap add-act-input-wrap-top">
              <MessageSquare size={16} strokeWidth={2.1} aria-hidden />
              <textarea
                id="add-act-comments"
                value={comments}
                rows={2}
                disabled={!canEdit || saving}
                placeholder="Optional comments"
                onChange={(event) => setComments(event.target.value)}
              />
            </div>
          </div>

          {errorMessage ? (
            <div className="add-act-error" role="alert">
              {errorMessage}
            </div>
          ) : null}
        </div>

        <footer className="add-act-footer">
          <button
            type="button"
            className="add-act-btn-secondary"
            disabled={saving}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="add-act-btn-primary"
            disabled={saving || !canEdit}
            onClick={() => {
              void handleSave();
            }}
          >
            {saving ? "Saving..." : "Save Actionable"}
          </button>
        </footer>
      </div>
    </div>
  );
}
