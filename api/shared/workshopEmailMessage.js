function buildWorkshopEmailContent({
  workshopName,
  organizationName,
  participantName,
  verificationCode,
  loginUrl,
  startDate,
  endDate,
}) {
  const name = String(participantName || "Participant").trim();
  const workshop = String(workshopName || "Workshop").trim();
  const org = String(organizationName || "").trim();
  const code = String(verificationCode || "").trim();
  const url =
    String(loginUrl || "").trim() ||
    "https://gentle-sea-0636fbe10.7.azurestaticapps.net";

  const subject = `Workshop invite: ${workshop}`;

  const text = [
    `Hi ${name},`,
    "",
    `You are invited to the workshop "${workshop}"${org ? ` for ${org}` : ""}.`,
    startDate ? `Start: ${startDate}` : "",
    endDate ? `End: ${endDate}` : "",
    "",
    `Login link: ${url}`,
    code ? `Your verification code: ${code}` : "",
    "",
    "Please do not share this code with anyone.",
    "",
    "— Team KNAV",
  ]
    .filter((line) => line !== "")
    .join("\n");

  const html = `
    <div style="font-family:Segoe UI,Arial,sans-serif;line-height:1.5;color:#111827">
      <p>Hi ${escapeHtml(name)},</p>
      <p>
        You are invited to the workshop
        <strong>${escapeHtml(workshop)}</strong>${
          org ? ` for <strong>${escapeHtml(org)}</strong>` : ""
        }.
      </p>
      ${
        startDate
          ? `<p><strong>Start:</strong> ${escapeHtml(String(startDate))}</p>`
          : ""
      }
      ${
        endDate
          ? `<p><strong>End:</strong> ${escapeHtml(String(endDate))}</p>`
          : ""
      }
      <p>
        <a href="${escapeHtml(url)}" style="color:#8f1738">Open login page</a>
      </p>
      ${
        code
          ? `<p><strong>Your verification code:</strong> ${escapeHtml(code)}</p>`
          : ""
      }
      <p>Please do not share this code with anyone.</p>
      <p>— Team KNAV</p>
    </div>
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
