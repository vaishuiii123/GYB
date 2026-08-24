const FONT =
  "Cambria,'Times New Roman',Times,serif";

function p(inner) {
  return `<p style="margin:0 0 12px 0;font-family:${FONT};font-size:14pt;line-height:1.5;color:#111827">${inner}</p>`;
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
  const workshop = String(workshopName || "Workshop").trim();
  const org = String(organizationName || "").trim();
  const userLogin = String(loginId || "").trim();
  const userPassword = String(password || "").trim();
  const url = String(loginUrl || "")
    .trim()
    .replace(/\/?$/, "/");
  const subjectOrg = org || "Workshop";
  const subject = `Invitation to Attend ${subjectOrg} Workshop`;

  const text = [
    `Dear ${name}`,
    "",
    `We are pleased to invite you to participate in the ${
      org || "workshop"
    } workshop.`,
    "",
    "This workshop is designed to provide valuable insights, practical knowledge and interactive discussions on digital transformation initiatives and best practices.",
    "",
    "Workshop Details are as follows",
    `Workshop Name : ${workshop}`,
    startDate ? `Start date & time : ${startDate}` : null,
    endDate ? `End date & time : ${endDate}` : null,
    "",
    "Access Details",
    userLogin ? `Username:-  ${userLogin}` : null,
    userPassword ? `Password:- ${userPassword}` : null,
    "",
    `🔗 Workshop Login :- ${url}`,
    "",
    "For security purposes, please keep your login credentials confidential and do not share them with anyone.",
    "",
    "We look forward to your participation and hope you find the session informative and engaging.",
    "",
    "Regards,",
    "Team KNAV",
  ]
    .filter((line) => line !== null)
    .join("\n");

  const orgHtml = org
    ? `<strong>${escapeHtml(org)}</strong>`
    : "workshop";

  const html = `
    <div style="font-family:${FONT};font-size:14pt;line-height:1.5;color:#111827">
      ${p(`Dear ${escapeHtml(name)}`)}
      ${p(
        `We are pleased to invite you to participate in the ${orgHtml} workshop.`
      )}
      ${p(
        "This workshop is designed to provide valuable insights, practical knowledge and interactive discussions on digital transformation initiatives and best practices."
      )}
      ${p("<strong>Workshop Details are as follows</strong>")}
      ${p(`Workshop Name : ${escapeHtml(workshop)}`)}
      ${
        startDate
          ? p(`Start date &amp; time : ${escapeHtml(String(startDate))}`)
          : ""
      }
      ${
        endDate
          ? p(`End date &amp; time : ${escapeHtml(String(endDate))}`)
          : ""
      }
      ${p("<strong>Access Details</strong>")}
      ${
        userLogin
          ? p(
              `Username:-  <a href="mailto:${escapeHtml(
                userLogin
              )}" style="font-family:${FONT};color:#0563c1">${escapeHtml(
                userLogin
              )}</a>`
            )
          : ""
      }
      ${
        userPassword
          ? p(`Password:- ${escapeHtml(userPassword)}`)
          : ""
      }
      ${p(
        `🔗 <strong>Workshop Login :-</strong> <a href="${escapeHtml(
          url
        )}" style="font-family:${FONT};color:#0563c1">${escapeHtml(url)}</a>`
      )}
      ${p(
        "For security purposes, please keep your login credentials confidential and do not share them with anyone."
      )}
      ${p(
        "We look forward to your participation and hope you find the session informative and engaging."
      )}
      ${p("Regards,<br />Team KNAV")}
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
