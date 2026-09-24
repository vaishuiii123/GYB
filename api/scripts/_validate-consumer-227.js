const path = require("path");
const XLSX = require("C:/Users/VaishnaviSapkal/Downloads/GYB-main_GYB/GYB-main/frontend/node_modules/xlsx");

function normalize(v) {
  return String(v || "")
    .replace(/\s+/g, " ")
    .replace(/[?]+$/g, "")
    .trim()
    .toLowerCase();
}
function text(v) {
  return String(v || "").replace(/\s+/g, " ").trim();
}
function isYes(v) {
  const r = String(v || "").trim().toUpperCase();
  return r === "Y" || r === "YES" || r === "TRUE" || r === "1";
}
function personalize(v) {
  return text(v)
    .replace(/<<Company's>>/gi, "KNAV's")
    .replace(/<<Compamy's>>/gi, "KNAV's")
    .replace(/<<Company>>/gi, "KNAV")
    .replace(/<<Compamy>>/gi, "KNAV");
}
function read(p, requireFlag) {
  const wb = XLSX.readFile(p);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
    defval: "",
  });
  return rows
    .map((r) => ({
      q: personalize(r.Question),
      d2c: isYes(r["Consumer D2C"]),
      retail: isYes(r["Consumer Retail"]),
      ok:
        text(r["Topmost category"]) &&
        text(r.Category) &&
        text(r.Question),
    }))
    .filter((r) => r.ok && (!requireFlag || r.d2c || r.retail));
}

const m = read(
  "C:/Users/VaishnaviSapkal/Downloads/Master OD Template.xlsx",
  true
);
const c = read(
  "C:/Users/VaishnaviSapkal/Downloads/Comsumer OD Template.xlsx",
  false
);
const map = new Map();
for (const r of [...m, ...c]) {
  const k = normalize(r.q);
  if (!map.has(k)) map.set(k, r.q);
}
console.log({ master: m.length, consumer: c.length, unique: map.size });
