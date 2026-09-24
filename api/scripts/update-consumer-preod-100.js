/**
 * Expand Consumer Pre OD to all 100 bank questions (33 master + 67 consumer)
 * and set Attachment = Y for every question.
 *
 * Usage:
 *   node update-consumer-preod-100.js [--execute]
 */
const fs = require("fs");
const path = require("path");

const API_BASE = process.env.GYB_API_BASE || "http://127.0.0.1:7071/api";
const TEMPLATE_NAME = "Consumer Pre OD";

async function api(route, options = {}) {
  const response = await fetch(`${API_BASE}/${route}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    throw new Error(
      `${route}: ${data.message || data.error || `HTTP ${response.status}`}`
    );
  }
  return data;
}

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

async function main() {
  const execute = process.argv.includes("--execute");
  const srNos = JSON.parse(
    fs.readFileSync(
      path.resolve(__dirname, "_preod-template-srnos.json"),
      "utf8"
    )
  ).consumer;

  const questionAttachments = Object.fromEntries(
    srNos.map((srNo) => [String(srNo), "Y"])
  );

  const existing = await api("get-pre-od-templates");
  const templates = existing.templates || [];
  const consumer = templates.find(
    (item) => normalize(item.templateName) === normalize(TEMPLATE_NAME)
  );

  const plan = {
    mode: execute ? "EXECUTE" : "DRY RUN",
    templateName: TEMPLATE_NAME,
    templateId: consumer?.id || null,
    action: consumer ? "update" : "create",
    questionCount: srNos.length,
    attachmentsYesCount: Object.values(questionAttachments).filter(
      (value) => value === "Y"
    ).length,
  };

  console.log(JSON.stringify(plan, null, 2));
  if (!execute) {
    return;
  }

  let result;
  if (consumer?.id) {
    result = await api("update-pre-od-template", {
      method: "POST",
      body: JSON.stringify({
        templateId: consumer.id,
        templateName: TEMPLATE_NAME,
        questionSrNos: srNos,
        questionAttachments,
        modifiedBy: "Consumer Pre OD 100 merge",
      }),
    });
  } else {
    result = await api("create-pre-od-template", {
      method: "POST",
      body: JSON.stringify({
        templateName: TEMPLATE_NAME,
        questionSrNos: srNos,
        questionAttachments,
        createdBy: "Consumer Pre OD 100 merge",
      }),
    });
  }

  console.log(
    JSON.stringify(
      {
        success: true,
        templateId: result.template?.id || consumer?.id || null,
        questionCount:
          result.template?.questionCount ||
          result.questionCount ||
          srNos.length,
        action: plan.action,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
