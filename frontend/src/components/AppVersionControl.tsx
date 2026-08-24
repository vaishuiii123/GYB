import { useMemo, useState } from "react";
import {
  GYB_APP_VERSION,
  GYB_LAST_SEEN_VERSION_KEY,
  GYB_RELEASE_NOTES,
} from "../config/appVersion";
import "../styles/AppVersionControl.css";

type AppVersionControlProps = {
  /** Use on maroon admin header for stronger contrast. */
  variant?: "default" | "onDark";
};

/**
 * NAO-style version badge + release notes modal.
 * Developers: bump GYB_APP_VERSION and prepend GYB_RELEASE_NOTES.
 */
export default function AppVersionControl({
  variant = "default",
}: AppVersionControlProps) {
  const [open, setOpen] = useState(false);
  const [seenVersion, setSeenVersion] = useState<string | null>(() => {
    try {
      return localStorage.getItem(GYB_LAST_SEEN_VERSION_KEY);
    } catch {
      return null;
    }
  });

  const hasUpdate = useMemo(() => {
    if (!seenVersion) {
      return true;
    }
    return seenVersion !== GYB_APP_VERSION;
  }, [seenVersion]);

  const markSeen = () => {
    try {
      localStorage.setItem(GYB_LAST_SEEN_VERSION_KEY, GYB_APP_VERSION);
    } catch {
      // ignore
    }
    setSeenVersion(GYB_APP_VERSION);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        className={`gyb-version-badge ${
          variant === "onDark" ? "gyb-version-badge-on-dark" : ""
        }`}
        onClick={() => setOpen(true)}
        title="GYB release notes"
      >
        {hasUpdate ? (
          <span className="gyb-version-new-label">New updates available</span>
        ) : null}
        <span className="gyb-version-number">v{GYB_APP_VERSION}</span>
        {hasUpdate ? (
          <span className="gyb-version-dot" aria-hidden="true" />
        ) : null}
      </button>

      {open ? (
        <div
          className="gyb-version-modal-backdrop"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            className="gyb-version-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="gyb-version-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="gyb-version-modal-header">
              <h2 id="gyb-version-modal-title">GYB release notes</h2>
              <button
                type="button"
                className="gyb-version-modal-close"
                aria-label="Close"
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="gyb-version-modal-body">
              {hasUpdate ? (
                <p className="gyb-version-update-banner">
                  New updates available (you last saw {seenVersion || "none"}).
                </p>
              ) : null}

              {GYB_RELEASE_NOTES.map((note) => (
                <section key={note.version} className="gyb-version-note">
                  <h3>
                    v{note.version} — {note.title}
                  </h3>
                  <p className="gyb-version-note-date">{note.date}</p>
                  <ul>
                    {note.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            <div className="gyb-version-modal-footer">
              {hasUpdate ? (
                <button
                  type="button"
                  className="gyb-version-btn-primary"
                  onClick={markSeen}
                >
                  Mark as seen
                </button>
              ) : null}
              <button
                type="button"
                className="gyb-version-btn-secondary"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
