#!/usr/bin/env node
/**
 * One-shot importer: reads the factory manager's Excel and seeds the Orders Airtable base.
 *
 * Usage:
 *   node scripts/import-orders-seed.js "/path/to/TPC Factory Order Management.xlsx"
 *
 * What it does:
 *   1. Creates a Client record for every unique "Customer Name" in the Main sheet.
 *   2. Creates a Job record for every Main-sheet row (preserves J#, Brand, Item, Qty, etc.).
 *   3. Best-effort maps the FM's detailed status text to our 6-stage model.
 *   4. Stores the original detailed status in `Internal Status`.
 *
 * Re-running creates duplicates. Delete existing records first if you need to re-seed.
 *
 * Requires env vars: AIRTABLE_TOKEN, AIRTABLE_ORDERS_BASE_ID, and optionally the
 * AIRTABLE_ORDERS_*_TABLE overrides. Load them by running via `--env-file=.env.local`
 * (Node 20+) or exporting them before running.
 */

const fs = require("node:fs");
const path = require("node:path");

const API = "https://api.airtable.com/v0";
const TOKEN = process.env.AIRTABLE_PAT_ORDERS || process.env.AIRTABLE_TOKEN;
const BASE = process.env.AIRTABLE_FACTORYOS_BASE_ID || process.env.AIRTABLE_ORDERS_BASE_ID;
const T = {
  clients: process.env.AIRTABLE_FACTORYOS_CLIENTS_TABLE || process.env.AIRTABLE_ORDERS_CLIENTS_TABLE || "Clients",
  jobs: process.env.AIRTABLE_FACTORYOS_JOBS_TABLE || process.env.AIRTABLE_ORDERS_JOBS_TABLE || "Jobs",
};

if (!TOKEN || !BASE) {
  console.error("ERROR: set AIRTABLE_PAT_ORDERS (or legacy AIRTABLE_TOKEN) and AIRTABLE_FACTORYOS_BASE_ID before running.");
  console.error("Tip (Node 20+): node --env-file=.env.local scripts/import-orders-seed.js <file>");
  process.exit(1);
}

const xlsxPath = process.argv[2];
if (!xlsxPath) {
  console.error("Usage: node scripts/import-orders-seed.js <path-to-xlsx>");
  process.exit(1);
}
if (!fs.existsSync(xlsxPath)) {
  console.error(`File not found: ${xlsxPath}`);
  process.exit(1);
}

// ---------- tiny xlsx reader (no deps) ----------
// We shell out to Python (which the user already has via the xlsx skill) to avoid
// adding an npm dep. Falls back to a helpful error if Python is missing.

const { execFileSync } = require("node:child_process");

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
  const out = execFileSync("python3", ["-c", py, file], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  return JSON.parse(out);
}

// ---------- Airtable helpers ----------

async function atPost(table, records) {
  const url = `${API}/${BASE}/${encodeURIComponent(table)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ records, typecast: true }),
  });
  if (!res.ok) throw new Error(`POST ${table} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function createBatched(table, fieldsList) {
  const created = [];
  for (let i = 0; i < fieldsList.length; i += 10) {
    const batch = fieldsList.slice(i, i + 10).map((fields) => ({ fields }));
    const res = await atPost(table, batch);
    created.push(...res.records);
    process.stdout.write(`\r  ${table}: ${created.length}/${fieldsList.length}`);
  }
  console.log("");
  return created;
}

// ---------- Stage mapper ----------

const STAGES = [
  "RM Pending",
  "Under Printing",
  "In Conversion",
  "Packing",
  "Ready for Dispatch",
  "Dispatched",
];

function mapStage(coarse, detailed) {
  const c = (coarse || "").toLowerCase().trim();
  const d = (detailed || "").toLowerCase().trim();
  if (c === "closed" || d.includes("close")) return "Dispatched";
  if (c === "in production" || d.includes("production")) return "In Conversion";
  if (c === "in printing" || d.includes("printing in progress") || d.includes("printing")) return "Under Printing";
  if (c === "rm" || d.includes("rm pending") || d.includes("plates pending") || d.includes("artwork dev")) return "RM Pending";
  if (d.includes("handle pasting")) return "Packing";
  if (d.includes("ready for dispatch")) return "Ready for Dispatch";
  return "RM Pending";
}

function normCategory(cat) {
  const s = String(cat || "").toLowerCase();
  if (s.includes("bag")) return "Paper Bag";
  if (s.includes("cup")) return "Paper Cups";
  if (s.includes("box")) return "Food Box";
  if (s.includes("tub")) return "Tub";
  return "Other";
}

// ---------- Main ----------

(async () => {
  console.log(`Reading ${path.basename(xlsxPath)}…`);
  const rows = readMainSheet(xlsxPath);
  console.log(`  ${rows.length} jobs found in Main sheet.`);

  // Unique clients.
  const clientNames = Array.from(
    new Set(rows.map((r) => String(r["Customer Name"] || "").trim()).filter(Boolean)),
  );
  console.log(`  ${clientNames.length} unique Customer Names → creating Clients…`);
  const now = new Date().toISOString();
  const clientRecords = await createBatched(
    T.clients,
    clientNames.map((name) => ({ Name: name, Created: now })),
  );
  const clientIdByName = Object.fromEntries(clientRecords.map((r) => [r.fields.Name, r.id]));

  // Jobs.
  const jobFields = [];
  const skipped = [];
  for (const r of rows) {
    const customerName = String(r["Customer Name"] || "").trim();
    const clientId = clientIdByName[customerName];
    if (!clientId) { skipped.push(r["J#"]); continue; }

    const stage = mapStage(r["Status"], r["Status"]);
    const detailed = r["Status"] && r["Status"] !== stage ? String(r["Status"]) : "";

    const fields = {
      "J#": String(r["J#"]),
      Client: [clientId],
      Brand: r["Brand"] ? String(r["Brand"]) : "",
      Category: normCategory(r["Category"]),
      Item: r["Item"] ? String(r["Item"]) : "",
      City: r["RM Delivery to"] ? String(r["RM Delivery to"]) : "",
      Qty: typeof r["Qty"] === "number" ? r["Qty"] : null,
      "Order Date": r["DOO"] ? String(r["DOO"]).slice(0, 10) : null,
      "Expected Dispatch Date": r["Production Due Date"] ? String(r["Production Due Date"]).slice(0, 10) : null,
      Stage: stage,
      "Internal Status": detailed || "",
      "RM Type": r["RM Type"] ? String(r["RM Type"]) : "",
      "RM Supplier": r["RM Supplier"] ? String(r["RM Supplier"]) : "",
      "Paper Type": r["Paper Type"] ? String(r["Paper Type"]) : "",
      GSM: typeof r["GSM"] === "number" ? r["GSM"] : null,
      "Printing Vendor": r["Printing Vendor"] ? String(r["Printing Vendor"]) : "",
      "Action Points": [r["Action Point 1"], r["Action Point 2"], r["Action Point 3"]].filter(Boolean).join("\n"),
      Created: now,
      "Last Updated": now,
    };
    // Strip null/empty-string fields so Airtable doesn't reject.
    for (const k of Object.keys(fields)) {
      if (fields[k] === null || fields[k] === "") delete fields[k];
    }
    jobFields.push(fields);
  }

  console.log(`  creating ${jobFields.length} Jobs…`);
  await createBatched(T.jobs, jobFields);
  if (skipped.length) console.log(`  (skipped ${skipped.length} rows with missing Customer Name)`);

  console.log("\n✓ Done. Next steps:");
  console.log("  1. Log into /orders as admin.");
  console.log("  2. Invite users (account managers, factory manager, customer logins per client).");
  console.log("  3. Open any Job to tweak its stage or add timeline notes.");
})().catch((err) => {
  console.error("\nFAILED:", err.message);
  process.exit(1);
});
