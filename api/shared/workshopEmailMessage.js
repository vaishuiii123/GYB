const FONT = "'Times New Roman',Times,serif";
const FONT_SIZE = "12pt";
const LINE_HEIGHT = "150%";
const TEXT_COLOR = "#000000";
const LINK_COLOR = "#0563C1";

/** Standard body paragraph with one blank-line gap after (Word-style). */
function p(inner, options = {}) {
  const marginBottom = options.marginBottom ?? "12pt";
  const paddingTop = options.paddingTop ?? "0";
  return `<p style="margin:0 0 ${marginBottom} 0;padding:${paddingTop} 0 0 0;font-family:${FONT};font-size:${FONT_SIZE};line-height:${LINE_HEIGHT};color:${TEXT_COLOR}">${inner}</p>`;
}

/** Credential lines sit closer together (no full blank line between them). */
function credentialLine(inner) {
  return `<p style="margin:0 0 4pt 0;padding:0;font-family:${FONT};font-size:${FONT_SIZE};line-height:${LINE_HEIGHT};color:${TEXT_COLOR}">${inner}</p>`;
}

function link(href, label) {
  return `<a href="${escapeHtml(href)}" style="font-family:${FONT};font-size:${FONT_SIZE};color:${LINK_COLOR};text-decoration:underline">${escapeHtml(
    label
  )}</a>`;
}

function formatOdDateRange(startDate, endDate) {
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  if (
    start &&
    !Number.isNaN(start.getTime()) &&
    end &&
    !Number.isNaN(end.getTime())
  ) {
    const sameYear = start.getFullYear() === end.getFullYear();
    const sameMonth = sameYear && start.getMonth() === end.getMonth();
    const startOpts = { month: "long", day: "numeric" };
    const endOpts = sameMonth
      ? { day: "numeric", year: "numeric" }
      : { month: "long", day: "numeric", year: "numeric" };

    if (start.toDateString() === end.toDateString()) {
      return start.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }

    if (sameMonth) {
      return `${start.toLocaleDateString("en-US", startOpts)}-${end.toLocaleDateString(
        "en-US",
        endOpts
      )}`;
    }

    return `${start.toLocaleDateString("en-US", startOpts)}-${end.toLocaleDateString(
      "en-US",
      endOpts
    )}`;
  }

  if (start && !Number.isNaN(start.getTime())) {
    return start.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  return String(startDate || endDate || "").trim();
}

function formatResponseDeadline(startDate) {
  if (!startDate) {
    return "";
  }

  const date = new Date(startDate);
  if (Number.isNaN(date.getTime())) {
    return String(startDate);
  }

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function buildWorkshopEmailContent({
  workshopName,
  organizationName,
  participantName,
  loginId,
  password,
  loginUrl,
  startDate,
  endDate,
}) {
  const name = String(participantName || "Participant").trim();
  const org = String(organizationName || "your organization").trim();
  const userLogin = String(loginId || "").trim();
  const userPassword = String(password || "").trim();
  const url = String(loginUrl || "")
    .trim()
    .replace(/\/?$/, "/");
  const odDates = formatOdDateRange(startDate, endDate);
  const responseDeadline = formatResponseDeadline(startDate);

  const subject =
    "Your Organisation Development Workshop with KNAV - Next Steps";

  const text = [
    `Dear ${name},`,
    "",
    `Team KNAV is delighted to invite you to your Organisation Development Workshop on ${odDates || "the scheduled dates"}.`,
    "",
    `This workshop is designed as a collaborative space to review the current state of ${org} and co-create a roadmap for its growth and development. Together, we will explore key areas such as your vision and mission, growth strategy, processes, service offerings, market opportunities, and governance - with the aim of aligning today's actions with tomorrow's aspirations.`,
    "",
    "Before the session, we would like to gather a well-rounded understanding of your business, including your perspectives on its future, as well as key facts about its financial position, market landscape, and overall operations. Please complete the Pre-Organisation Development Workshop Questionnaire on our Grow Your Business Platform using the details below:",
    "",
    url ? `Website: ${url}` : null,
    userLogin ? `Login ID: ${userLogin}` : null,
    userPassword ? `Password: ${userPassword}` : null,
    "",
    responseDeadline
      ? `Kindly share your responses on the platform by ${responseDeadline}.`
      : "Kindly share your responses on the platform before the workshop begins.",
    "",
    "If you have any questions or need support, feel free to reach out directly to a Team KNAV member over email.",
    "",
    "We look forward to your inputs and to an engaging workshop ahead!",
    "",
    "Best regards,",
    "KNAV Advisory Team",
  ]
    .filter((line) => line !== null)
    .join("\n");

  const credentialsHtml = [
    url
      ? credentialLine(
          `<strong>Website:</strong> ${link(url, url)}`
        )
      : "",
    userLogin
      ? credentialLine(
          `<strong>Login ID:</strong> ${link(`mailto:${userLogin}`, userLogin)}`
        )
      : "",
    userPassword
      ? credentialLine(
          `<strong>Password:</strong> ${escapeHtml(userPassword)}`
        )
      : "",
  ]
    .filter(Boolean)
    .join("");

  const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin:0;padding:0;background:#ffffff;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background:#ffffff;">
      <tr>
        <td style="padding:24px 28px;font-family:${FONT};font-size:${FONT_SIZE};line-height:${LINE_HEIGHT};color:${TEXT_COLOR};">
          ${p(`Dear ${escapeHtml(name)},`)}
          ${p(
            `Team KNAV is delighted to invite you to your Organisation Development Workshop on <strong>${escapeHtml(
              odDates || "the scheduled dates"
            )}</strong>.`
          )}
          ${p(
            `This workshop is designed as a collaborative space to review the current state of <strong>${escapeHtml(
              org
            )}</strong> and co-create a roadmap for its growth and development. Together, we will explore key areas such as your vision and mission, growth strategy, processes, service offerings, market opportunities, and governance - with the aim of aligning today's actions with tomorrow's aspirations.`
          )}
          ${p(
            "Before the session, we would like to gather a well-rounded understanding of your business, including your perspectives on its future, as well as key facts about its financial position, market landscape, and overall operations. Please complete the <strong>Pre-Organisation Development Workshop Questionnaire</strong> on our Grow Your Business Platform using the details below:"
          )}
          ${
            credentialsHtml
              ? `<div style="margin:0 0 12pt 0;">${credentialsHtml}</div>`
              : ""
          }
          ${p(
            responseDeadline
              ? `Kindly share your responses on the platform by <strong>${escapeHtml(
                  responseDeadline
                )}</strong>.`
              : "Kindly share your responses on the platform before the workshop begins."
          )}
          ${p(
            "If you have any questions or need support, feel free to reach out directly to a Team KNAV member over email."
          )}
          ${p(
            "We look forward to your inputs and to an engaging workshop ahead!"
          )}
          ${p(
            `Best regards,<br /><span style="font-family:${FONT};font-size:${FONT_SIZE};">KNAV Advisory Team</span>`,
            { marginBottom: "0" }
          )}
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();

  return { subject, text, html };
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = {
  buildWorkshopEmailContent,
};
