/**
 * GYB release metadata — bump `GYB_APP_VERSION` and prepend a releaseNotes
 * entry whenever you ship user-visible changes. Compared to localStorage
 * `gyb_last_seen_version` to show "New updates available" (NAO pattern).
 */

export const GYB_APP_VERSION = "1.0.0";

export type GybReleaseNote = {
  version: string;
  date: string; // ISO date YYYY-MM-DD
  title: string;
  bullets: string[];
};

/** Newest first. */
export const GYB_RELEASE_NOTES: GybReleaseNote[] = [
  {
    version: "1.0.0",
    date: "2026-08-24",
    title: "Grow Your Business v1.0.0",
    bullets: [
      "OD chart shows only questions from the workshop’s Master OD template.",
      "Chart returns to the category you opened after answering questions.",
      "Export ZIP includes Excel responses plus Attachments folders by participant and question.",
      "Summary pies only for Multiple Choice, Single Choice, and Rating (not Text).",
      "Export tabs for Vision & Mission and Actionable.",
      "Header version badge with release notes (admin and participant).",
    ],
  },
];

export const GYB_LAST_SEEN_VERSION_KEY = "gyb_last_seen_version";
