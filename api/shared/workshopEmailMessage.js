const {
  getDefaultWorkshopEmailTemplate,
} = require("./workshopEmailTemplate");

const FONT = "'Times New Roman',Times,serif";
const FONT_SIZE = "12pt";
const LINE_HEIGHT = "150%";
const TEXT_COLOR = "#000000";
const LINK_COLOR = "#0563C1";

/** Standard body paragraph with one blank-line gap after (Word-style). */
function p(inner, options = {}) {
  const marginBottom = options.marginBottom ?? "12pt";
  const paddingTop = options.paddingTop ?? "0";
  return `<p style="margin:0 0 ${marginBottom} 0;margin-left:0;margin-right:0;padding:${paddingTop} 0 0 0;padding-left:0;text-indent:0;text-align:left;font-family:${FONT};font-size:${FONT_SIZE};line-height:${LINE_HEIGHT};color:${TEXT_COLOR}">${inner}</p>`;
}

/** Credential lines sit closer together (no full blank line between them). */
function credentialLine(inner) {
  return `<p style="margin:0 0 4pt 0;margin-left:0;margin-right:0;padding:0;padding-left:0;text-indent:0;text-align:left;font-family:${FONT};font-size:${FONT_SIZE};line-height:${LINE_HEIGHT};color:${TEXT_COLOR}">${inner}</p>`;
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

function applyPlaceholders(template, values) {
  return String(template || "").replace(
    /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
    (_, key) => {
      const value = values[key];
      return value == null ? "" : String(value);
    }
  );
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isCredentialLine(line) {
  return /^(Website|Login ID|Password)\s*:/i.test(String(line || "").trim());
}

function renderCredentialHtml(line, values) {
  const trimmed = String(line || "").trim();
  const match = trimmed.match(/^(Website|Login ID|Password)\s*:\s*(.*)$/i);
  if (!match) {
    return credentialLine(escapeHtml(trimmed));
  }

  const label = match[1];
  const lower = label.toLowerCase();

  if (lower === "website") {
    const url = String(values.loginUrl || "").trim();
    if (!url) return "";
    return credentialLine(`<strong>Website:</strong> ${link(url, url)}`);
  }

  if (lower === "login id") {
    const loginId = String(values.loginId || "").trim();
    if (!loginId) return "";
    return credentialLine(
      `<strong>Login ID:</strong> ${link(`mailto:${loginId}`, loginId)}`
    );
  }

  const password = String(values.password || "").trim();
  if (!password) return "";
  return credentialLine(
    `<strong>Password:</strong> ${escapeHtml(password)}`
  );
}

function buildHtmlFromBody(filledBody, values) {
  const lines = String(filledBody || "").split(/\r?\n/);
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (isCredentialLine(line)) {
      const credentialHtml = [];
      while (i < lines.length && isCredentialLine(lines[i])) {
        const html = renderCredentialHtml(lines[i], values);
        if (html) credentialHtml.push(html);
        i += 1;
      }
      if (credentialHtml.length > 0) {
        blocks.push(
          `<div style="margin:0 0 12pt 0;margin-left:0;padding:0;padding-left:0;text-align:left;">${credentialHtml.join(
            ""
          )}</div>`
        );
      }
      continue;
    }

    if (!String(line || "").trim()) {
      i += 1;
      continue;
    }

    const paragraphLines = [];
    while (i < lines.length && String(lines[i] || "").trim()) {
      if (isCredentialLine(lines[i])) {
        break;
      }
      paragraphLines.push(String(lines[i]));
      i += 1;
    }

    const inner = escapeHtml(paragraphLines.join("\n")).replace(/\n/g, "<br />");
    const isLast = i >= lines.length;
    blocks.push(p(inner, isLast ? { marginBottom: "0" } : undefined));
  }

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin:0;padding:0;background:#ffffff;text-align:left;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" align="left" style="border-collapse:collapse;margin:0;padding:0;background:#ffffff;">
      <tr>
        <td align="left" style="margin:0;padding:0;padding-left:0;text-align:left;font-family:${FONT};font-size:${FONT_SIZE};line-height:${LINE_HEIGHT};color:${TEXT_COLOR};">
          ${blocks.join("\n")}
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();
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
  template,
}) {
  const name = String(participantName || "Participant").trim();
  const org = String(organizationName || "your organization").trim();
  const userLogin = String(loginId || "").trim();
  const userPassword = String(password || "").trim();
  const url = String(loginUrl || "")
    .trim()
    .replace(/\/?$/, "/");
  const odDates = formatOdDateRange(startDate, endDate) || "the scheduled dates";
  const responseDeadline =
    formatResponseDeadline(startDate) ||
    "before the workshop begins";

  const resolvedTemplate = {
    subject:
      String(template?.subject || "").trim() ||
      getDefaultWorkshopEmailTemplate().subject,
    body:
      String(template?.body || "").trim() ||
      getDefaultWorkshopEmailTemplate().body,
  };

  const values = {
    workshopName: String(workshopName || "").trim(),
    participantName: name,
    organizationName: org,
    loginId: userLogin,
    password: userPassword,
    loginUrl: url,
    odDates,
    responseDeadline,
  };

  const subject = applyPlaceholders(resolvedTemplate.subject, values);
  const text = applyPlaceholders(resolvedTemplate.body, values)
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trim();
      if (/^Website\s*:/i.test(trimmed) && !url) return false;
      if (/^Login ID\s*:/i.test(trimmed) && !userLogin) return false;
      if (/^Password\s*:/i.test(trimmed) && !userPassword) return false;
      return true;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const html = buildHtmlFromBody(text, values);

  return { subject, text, html };
}

module.exports = {
  buildWorkshopEmailContent,
};
