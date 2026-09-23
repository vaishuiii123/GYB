const fs = require("fs");
const path = require("path");

const API_BASE = process.env.GYB_API_BASE || "http://127.0.0.1:7071/api";

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

async function main() {
  const execute = process.argv.includes("--execute");
  const srNos = JSON.parse(
    fs.readFileSync(
      path.resolve(__dirname, "_preod-template-srnos.json"),
      "utf8"
    )
  );

  const existing = await api("get-pre-od-templates");
  const templates = existing.templates || [];
  const workshops = (await api("get-workshops")).workshops || [];

  const plan = {
    mode: execute ? "EXECUTE" : "DRY RUN",
    delete: templates.map((item) => ({
      id: item.id,
      name: item.templateName,
      questionCount: item.questionCount,
    })),
    create: [
      {
        templateName: "Master Pre OD",
        questionCount: srNos.master.length,
        questionSrNos: srNos.master,
      },
      {
        templateName: "Consumer Pre OD",
        questionCount: srNos.consumer.length,
        questionSrNos: srNos.consumer,
      },
    ],
    workshopsToRetarget: workshops.map((item) => ({
      id: item.id,
      name: item.workshopName,
      currentPreOdTemplateId: item.preOdTemplateId || "",
      currentPreOdTemplateName: item.preOdTemplateName || "",
    })),
  };

  console.log(JSON.stringify(plan, null, 2));
  if (!execute) return;

  for (const item of templates) {
    await api(`delete-pre-od-template?id=${encodeURIComponent(item.id)}`, {
      method: "DELETE",
    });
  }

  const created = [];
  for (const item of plan.create) {
    const result = await api("create-pre-od-template", {
      method: "POST",
      body: JSON.stringify({
        templateName: item.templateName,
        questionSrNos: item.questionSrNos,
        questionAttachments: {},
        createdBy: "Pre OD workbook import",
      }),
    });
    created.push(result.template);
  }

  const masterPreOd = created.find((item) => item.templateName === "Master Pre OD");

  // Point existing workshops at Master Pre OD so they keep a valid template.
  const workshopUpdates = [];
  for (const workshop of workshops) {
    const data = await api("save-workshop-pre-od", {
      method: "POST",
      body: JSON.stringify({
        workshopId: workshop.id,
        questionSrNos: srNos.master,
        questionAttachments: {},
        customQuestions: [],
        preOdTemplateId: masterPreOd.id,
        preOdTemplateName: masterPreOd.templateName,
      }),
    });
    workshopUpdates.push({
      id: workshop.id,
      name: workshop.workshopName,
      success: true,
      preOdTemplateId: masterPreOd.id,
      questionCount: data.questionCount || srNos.master.length,
    });
  }

  console.log(
    JSON.stringify(
      {
        success: true,
        created: created.map((item) => ({
          id: item.id,
          name: item.templateName,
          questionCount: item.questionCount,
        })),
        workshopUpdates,
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
