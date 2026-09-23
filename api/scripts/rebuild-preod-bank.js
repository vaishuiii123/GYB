const fs = require("fs");
const path = require("path");

const data = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "_preod-workbooks.json"), "utf8")
);

const catMap = {
  General: "GENERAL",
  "Markets and customers": "MARKETS",
  "Business Planning & Decision Making": "PLANNING",
  Financials: "FINANCIAL",
  Financial: "FINANCIAL",
};

function cleanQuestion(raw) {
  return String(raw || "")
    .replace(/\r\n/g, "\n")
    .replace(/<<Company>\.'s/gi, "<<Company's>>")
    .replace(/<<Company>\.s/gi, "<<Company's>>")
    .replace(/<<Company>\./gi, "<<Company>>")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeJs(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n");
}

const master = data["Master Pre OD.xlsx"].map((row) => ({
  srNo: Number(row.srNo),
  categoryKey: catMap[row.category] || "GENERAL",
  question: cleanQuestion(row.question),
}));

const consumer = data["Consumer Pre OD.xlsx"].map((row, index) => ({
  srNo: 34 + index,
  workbookSr: Number(row.srNo),
  categoryKey: catMap[row.category] || "MARKETS",
  question: cleanQuestion(row.question),
}));

const lines = [
  "const PRE_OD_CATEGORIES = {",
  "  GENERAL: \"General\",",
  "  MARKETS: \"Markets and customers\",",
  "  PLANNING: \"Business Planning & Decision Making\",",
  "  FINANCIAL: \"Financials\",",
  "};",
  "",
  "const PRE_OD_QUESTIONS = [",
];

for (const item of [...master, ...consumer]) {
  lines.push(
    `  { srNo: ${item.srNo}, category: PRE_OD_CATEGORIES.${item.categoryKey}, question: '${escapeJs(item.question)}' },`
  );
}

lines.push(
  "];",
  "",
  "function getPreOdQuestions() {",
  "  return PRE_OD_QUESTIONS.map((item) => ({",
  "    ...item,",
  '    section: item.srNo <= 33 ? "A" : "B",',
  "  }));",
  "}",
  "",
  "module.exports = {",
  "  PRE_OD_CATEGORIES,",
  "  PRE_OD_QUESTIONS,",
  "  getPreOdQuestions,",
  "};",
  ""
);

fs.writeFileSync(
  path.resolve(__dirname, "../shared/preOdQuestions.js"),
  lines.join("\n")
);

fs.writeFileSync(
  path.resolve(__dirname, "_preod-template-srnos.json"),
  JSON.stringify(
    {
      master: master.map((item) => String(item.srNo)),
      consumer: consumer.map((item) => String(item.srNo)),
    },
    null,
    2
  )
);

console.log(
  JSON.stringify(
    {
      bankCount: master.length + consumer.length,
      master: master.length,
      consumer: consumer.length,
      consumerBankRange: [consumer[0].srNo, consumer.at(-1).srNo],
    },
    null,
    2
  )
);
