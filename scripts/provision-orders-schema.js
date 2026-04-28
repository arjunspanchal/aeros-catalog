#!/usr/bin/env node
/**
 * One-shot: create the Orders base schema via Airtable Meta API.
 * Run with: node --env-file=.env.local scripts/provision-orders-schema.js
 *
 * Requires AIRTABLE_TOKEN with scopes: schema.bases:read, schema.bases:write.
 * Re-running after tables exist will fail on those tables — it's not idempotent.
 */

const TOKEN = process.env.AIRTABLE_PAT_ORDERS || process.env.AIRTABLE_TOKEN;
const BASE = process.env.AIRTABLE_FACTORYOS_BASE_ID || process.env.AIRTABLE_ORDERS_BASE_ID;
if (!TOKEN || !BASE) { console.error("Set AIRTABLE_PAT_ORDERS (or legacy AIRTABLE_TOKEN) and AIRTABLE_FACTORYOS_BASE_ID"); process.exit(1); }

const API = `https://api.airtable.com/v0/meta/bases/${BASE}/tables`;

async function listExisting() {
  const res = await fetch(API, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (!res.ok) throw new Error(`list failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return Object.fromEntries((data.tables || []).map((t) => [t.name, t]));
}

async function createTable(def, existing) {
  if (existing && existing[def.name]) {
    console.log(`   (exists) reusing ${def.name}`);
    return existing[def.name];
  }
  const res = await fetch(API, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(def),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Create ${def.name} failed: ${res.status} ${body}`);
  return JSON.parse(body);
}

async function addField(tableId, field) {
  const res = await fetch(`${API}/${tableId}/fields`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(field),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Add field ${field.name} failed: ${res.status} ${body}`);
  return JSON.parse(body);
}

const STAGE_CHOICES = [
  { name: "RM Pending"   },
  { name: "Under Printing" },
  { name: "In Conversion"   },
  { name: "Packing" },
  { name: "Ready for Dispatch"  },
  { name: "Dispatched"  },
];

const ROLE_CHOICES = [
  { name: "admin"    },
  { name: "account_manager"   },
  { name: "factory_manager" },
  { name: "customer"  },
];

const CATEGORY_CHOICES = [
  { name: "Paper Bag" },
  { name: "Paper Cups" },
  { name: "Food Box" },
  { name: "Tub" },
  { name: "Other" },
];

(async () => {
  const existing = await listExisting();
  console.log("1/5 Clients…");
  const Clients = await createTable({
    name: "Clients",
    fields: [
      { name: "Name",            type: "singleLineText" },
      { name: "Code",            type: "singleLineText" },
      { name: "Contact Person",  type: "singleLineText" },
      { name: "Contact Email",   type: "email" },
      { name: "Contact Phone",   type: "phoneNumber" },
      { name: "Created",         type: "dateTime", options: { dateFormat: { name: "iso" }, timeFormat: { name: "24hour" }, timeZone: "utc" } },
    ],
  }, existing);
  console.log("   ok:", Clients.id);

  console.log("2/5 Users…");
  const Users = await createTable({
    name: "Users",
    fields: [
      { name: "Email",   type: "email" },
      { name: "Name",    type: "singleLineText" },
      { name: "Role",    type: "singleSelect", options: { choices: ROLE_CHOICES } },
      { name: "Client",  type: "multipleRecordLinks", options: { linkedTableId: Clients.id } },
      { name: "Active",  type: "checkbox", options: { color: "greenBright", icon: "check" } },
      { name: "Created", type: "dateTime", options: { dateFormat: { name: "iso" }, timeFormat: { name: "24hour" }, timeZone: "utc" } },
    ],
  }, existing);
  console.log("   ok:", Users.id);

  console.log("3/5 Jobs…");
  const Jobs = await createTable({
    name: "Jobs",
    fields: [
      { name: "J#",                      type: "singleLineText" },
      { name: "Client",                  type: "multipleRecordLinks", options: { linkedTableId: Clients.id } },
      { name: "Brand",                   type: "singleLineText" },
      { name: "Customer Manager",        type: "multipleRecordLinks", options: { linkedTableId: Users.id } },
      { name: "Category",                type: "singleSelect", options: { choices: CATEGORY_CHOICES } },
      { name: "Item",                    type: "singleLineText" },
      { name: "City",                    type: "singleLineText" },
      { name: "Qty",                     type: "number", options: { precision: 0 } },
      { name: "Order Date",              type: "date", options: { dateFormat: { name: "iso" } } },
      { name: "Expected Dispatch Date",  type: "date", options: { dateFormat: { name: "iso" } } },
      { name: "Stage",                   type: "singleSelect", options: { choices: STAGE_CHOICES } },
      { name: "Internal Status",         type: "singleLineText" },
      { name: "PO Number",               type: "singleLineText" },
      { name: "RM Type",                 type: "singleLineText" },
      { name: "RM Supplier",             type: "singleLineText" },
      { name: "Paper Type",              type: "singleLineText" },
      { name: "GSM",                     type: "number", options: { precision: 0 } },
      { name: "Printing Vendor",         type: "singleLineText" },
      { name: "Action Points",           type: "multilineText" },
      { name: "Notes",                   type: "multilineText" },
      { name: "Created",                 type: "dateTime", options: { dateFormat: { name: "iso" }, timeFormat: { name: "24hour" }, timeZone: "utc" } },
      { name: "Last Updated",            type: "dateTime", options: { dateFormat: { name: "iso" }, timeFormat: { name: "24hour" }, timeZone: "utc" } },
    ],
  }, existing);
  console.log("   ok:", Jobs.id);

  console.log("4/5 Job Status Updates…");
  const Updates = await createTable({
    name: "Job Status Updates",
    fields: [
      { name: "Summary",           type: "singleLineText" },
      { name: "Job",               type: "multipleRecordLinks", options: { linkedTableId: Jobs.id } },
      { name: "Stage",             type: "singleSelect", options: { choices: STAGE_CHOICES } },
      { name: "Updated By Email",  type: "email" },
      { name: "Updated By Name",   type: "singleLineText" },
      { name: "Note",              type: "multilineText" },
      { name: "Created",           type: "dateTime", options: { dateFormat: { name: "iso" }, timeFormat: { name: "24hour" }, timeZone: "utc" } },
    ],
  }, existing);
  console.log("   ok:", Updates.id);

  console.log("5/5 OTP Codes…");
  const OTP = await createTable({
    name: "OTP Codes",
    fields: [
      { name: "Email",      type: "email" },
      { name: "Code",       type: "singleLineText" },
      { name: "Expires At", type: "dateTime", options: { dateFormat: { name: "iso" }, timeFormat: { name: "24hour" }, timeZone: "utc" } },
      { name: "Used",       type: "checkbox", options: { color: "greenBright", icon: "check" } },
      { name: "Created",    type: "dateTime", options: { dateFormat: { name: "iso" }, timeFormat: { name: "24hour" }, timeZone: "utc" } },
    ],
  }, existing);
  console.log("   ok:", OTP.id);

  console.log("\n✓ All 5 tables created.");
  console.log("Note: Airtable created each table with a default primary field. Review and, if needed, drag-to-reorder so the fields above are primary. The code references fields by name, so reordering doesn't break anything.");
  console.log("You can delete the leftover 'Table 1' and '__probe_delete_me' tables manually from the Airtable UI.");
})().catch((e) => { console.error("\nFAILED:", e.message); process.exit(1); });
