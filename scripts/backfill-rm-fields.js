#!/usr/bin/env node
/**
 * Backfill the new RM + printing/production fields onto already-seeded Jobs.
 *
 * Reads the factory manager's xlsx, matches rows to Jobs by J#, and PATCHes any
 * empty RM/size/printing/production fields. Existing values are left alone so
 * this is safe to re-run.
 *
 *   node --env-file=.env.local scripts/backfill-rm-fields.js \
 *     "/Users/arjunpanchal/Downloads/TPC Factory Order Management.xlsx"
 */

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");

const API = "https://api.airtable.com/v0";
const TOKEN = process.env.AIRTABLE_TOKEN;
const BASE = process.env.AIRTABLE_ORDERS_BASE_ID;
const T = { jobs: process.env.AIRTABLE_ORDERS_JOBS_TABLE || "Jobs" };

if (!TOKEN || !BASE) { console.error("Set AIRTABLE_TOKEN and AIRTABLE_ORDERS_BASE_ID"); process.exit(1); }
const xlsx = process.argv[2];
if (!xlsx || !fs.existsSync(xlsx)) { console.error("Usage: node scripts/backfill-rm-fields.js <xlsx>"); process.exit(1); }

function readMainSheet(file) {
  const py = `
import json, sys
from openpyxl import load_workbook
wb = load_workbook(sys.argv[1], data_only=True)
ws = wb["Main"]
headers = [ws.cell(2, c).value for c in range(1, ws.max_column + 1)]
rows = []
for r in range(3, ws.max_row + 1):
    row = {}
    for c, h in enumerate(headers, 1):
        if h is None: continue
        v = ws.cell(r, c).value
        if hasattr(v, "isoformat"): v = v.isoformat()
        row[str(h).strip()] = v
    if row.get("J#"): rows.append(row)
print(json.dumps(rows))
`;
  return JSON.parse(execFileSync("python3", ["-c", py, file], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }));
}

async function listAllJobs() {
  const records = [];
  let offset;
  do {
    const url = new URL(`${API}/${BASE}/${encodeURIComponent(T.jobs)}`);
    url.searchParams.set("pageSize", "100");
    if (offset) url.searchParams.set("offset", offset);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (!res.ok) throw new Error(`list jobs: ${res.status} ${await res.text()}`);
    const data = await res.json();
    records.push(...data.records);
    offset = data.offset;
  } while (offset);
  return records;
}

async function patchJob(id, fields) {
  const res = await fetch(`${API}/${BASE}/${encodeURIComponent(T.jobs)}/${id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields, typecast: true }),
  });
  if (!res.ok) throw new Error(`patch ${id}: ${res.status} ${await res.text()}`);
  return res.json();
}

function num(v) { return typeof v === "number" ? v : null; }
function dateIso(v) {
  if (!v) return null;
  const s = String(v).slice(0, 10);
  // Must look like YYYY-MM-DD — skip free-text like "Pending"
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

(async () => {
  const rows = readMainSheet(xlsx);
  const byJ = Object.fromEntries(rows.map((r) => [String(r["J#"]), r]));
  const jobs = await listAllJobs();
  let patched = 0;
  for (const j of jobs) {
    const src = byJ[j.fields["J#"]];
    if (!src) continue;
    const f = j.fields;
    const patch = {};
    const setIfEmpty = (key, value) => {
      if (value == null || value === "") return;
      const cur = f[key];
      if (cur == null || cur === "") patch[key] = value;
    };
    setIfEmpty("Item Size", src["Item Size (mm)"] || src["Item Size (inch)"] || "");
    setIfEmpty("RM Size (mm)", num(src["RM Size (in mm)"]));
    setIfEmpty("RM Qty (Sheets)", num(src["RM Quantity (in Sheet)"]));
    setIfEmpty("RM Qty (kgs)", num(src["RM Quantity (in kgs)"]));
    setIfEmpty("RM Delivery Date", dateIso(src["RM Delivery Date"]));
    setIfEmpty("Printing Type", src["Printing Type"] || "");
    setIfEmpty("Printing Due Date", dateIso(src["Printing Due Date"]));
    setIfEmpty("Production Due Date", dateIso(src["Production Due Date"]));
    if (Object.keys(patch).length === 0) continue;
    await patchJob(j.id, patch);
    patched++;
    if (patched % 10 === 0) process.stdout.write(`\r  patched ${patched}…`);
  }
  console.log(`\n✓ Backfilled ${patched} jobs out of ${jobs.length}.`);
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
