// Thin Airtable REST client scoped to the FactoryOS base. Server-side only.
//
// Env var compatibility: the primary name is AIRTABLE_FACTORYOS_*, with the
// legacy AIRTABLE_ORDERS_* name as a fallback so Vercel env can be migrated
// without a synchronised deploy.

const API = "https://api.airtable.com/v0";
const CONTENT_API = "https://content.airtable.com/v0";

function firstEnv(...keys) {
  for (const k of keys) {
    const v = process.env[k];
    if (v) return v;
  }
  throw new Error(`Missing env var: ${keys.join(" or ")}`);
}

function baseId() {
  return firstEnv("AIRTABLE_FACTORYOS_BASE_ID", "AIRTABLE_ORDERS_BASE_ID");
}

function baseUrl(table) {
  return `${API}/${baseId()}/${encodeURIComponent(table)}`;
}

// Scoped Orders PAT (1.2). Falls back to legacy AIRTABLE_TOKEN during cutover.
// HR tables (Employees, Attendance) currently live in this same Orders base
// and are read through this PAT until 1.3 splits them out behind AIRTABLE_PAT_HR.
function headers() {
  return {
    Authorization: `Bearer ${firstEnv("AIRTABLE_PAT_ORDERS", "AIRTABLE_TOKEN")}`,
    "Content-Type": "application/json",
  };
}

export async function airtableList(table, { filterByFormula, sort, maxRecords, pageSize } = {}) {
  const url = new URL(baseUrl(table));
  if (filterByFormula) url.searchParams.set("filterByFormula", filterByFormula);
  if (maxRecords) url.searchParams.set("maxRecords", String(maxRecords));
  if (pageSize) url.searchParams.set("pageSize", String(pageSize));
  if (sort) sort.forEach((s, i) => {
    url.searchParams.set(`sort[${i}][field]`, s.field);
    if (s.direction) url.searchParams.set(`sort[${i}][direction]`, s.direction);
  });
  const records = [];
  let offset;
  do {
    if (offset) url.searchParams.set("offset", offset);
    const res = await fetch(url.toString(), { headers: headers(), cache: "no-store" });
    if (!res.ok) throw new Error(`Airtable list ${table} failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    records.push(...data.records);
    offset = data.offset;
  } while (offset);
  return records;
}

export async function airtableGet(table, id) {
  const res = await fetch(`${baseUrl(table)}/${id}`, { headers: headers(), cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Airtable get ${table}/${id} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function airtableCreate(table, fields, { typecast = true } = {}) {
  const res = await fetch(baseUrl(table), {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ fields, typecast }),
  });
  if (!res.ok) throw new Error(`Airtable create ${table} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function airtableUpdate(table, id, fields, { typecast = true } = {}) {
  const res = await fetch(`${baseUrl(table)}/${id}`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify({ fields, typecast }),
  });
  if (!res.ok) throw new Error(`Airtable update ${table}/${id} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function airtableDelete(table, id) {
  const res = await fetch(`${baseUrl(table)}/${id}`, { method: "DELETE", headers: headers() });
  if (!res.ok) throw new Error(`Airtable delete ${table}/${id} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

// Upload an attachment to a record's attachment field via Airtable's content
// API. Used by repo.js attachment helpers (user photos, job LR files, customer
// PO PDFs, Aadhar photos). Centralises token + base resolution so callers
// don't re-read process.env directly — that pattern was a leftover from before
// 1.2 and double-broken because it skipped the AIRTABLE_FACTORYOS_BASE_ID
// fallback that every other helper here respects.
export async function airtableUploadAttachment(recordId, fieldName, { contentType, filename, fileBase64 }) {
  const url = `${CONTENT_API}/${baseId()}/${recordId}/${encodeURIComponent(fieldName)}/uploadAttachment`;
  const res = await fetch(url, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ contentType, filename, file: fileBase64 }),
  });
  if (!res.ok) throw new Error(`Airtable upload ${fieldName} on ${recordId} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

// Each getter prefers the new AIRTABLE_FACTORYOS_* name, with the legacy
// AIRTABLE_ORDERS_* name as a fallback. Default table names unchanged.
const pickEnv = (primary, legacy, fallback) =>
  process.env[primary] || process.env[legacy] || fallback;

export const TABLES = {
  clients:        () => pickEnv("AIRTABLE_FACTORYOS_CLIENTS_TABLE",     "AIRTABLE_ORDERS_CLIENTS_TABLE",     "Clients"),
  users:          () => pickEnv("AIRTABLE_FACTORYOS_USERS_TABLE",       "AIRTABLE_ORDERS_USERS_TABLE",       "Users"),
  jobs:           () => pickEnv("AIRTABLE_FACTORYOS_JOBS_TABLE",        "AIRTABLE_ORDERS_JOBS_TABLE",        "Jobs"),
  updates:        () => pickEnv("AIRTABLE_FACTORYOS_UPDATES_TABLE",     "AIRTABLE_ORDERS_UPDATES_TABLE",     "Job Status Updates"),
  otp:            () => pickEnv("AIRTABLE_FACTORYOS_OTP_TABLE",         "AIRTABLE_ORDERS_OTP_TABLE",         "OTP Codes"),
  customerPOs:    () => pickEnv("AIRTABLE_FACTORYOS_CUSTOMER_POS_TABLE","AIRTABLE_ORDERS_CUSTOMER_POS_TABLE","Customer POs"),
  rawMaterials:   () => pickEnv("AIRTABLE_FACTORYOS_RM_TABLE",          "AIRTABLE_ORDERS_RM_TABLE",          "RM Inventory"),
  rmReceipts:     () => pickEnv("AIRTABLE_FACTORYOS_RM_RECEIPTS_TABLE", "AIRTABLE_ORDERS_RM_RECEIPTS_TABLE", "RM Receipts"),
  machines:       () => pickEnv("AIRTABLE_FACTORYOS_MACHINES_TABLE",    "AIRTABLE_ORDERS_MACHINES_TABLE",    "Machines"),
  productionRuns: () => pickEnv("AIRTABLE_FACTORYOS_RUNS_TABLE",        "AIRTABLE_ORDERS_RUNS_TABLE",        "Production Runs"),
  rmConsumption:  () => pickEnv("AIRTABLE_FACTORYOS_CONSUMPTION_TABLE", "AIRTABLE_ORDERS_CONSUMPTION_TABLE", "RM Consumption"),
  employees:      () => pickEnv("AIRTABLE_FACTORYOS_EMPLOYEES_TABLE",   "AIRTABLE_ORDERS_EMPLOYEES_TABLE",   "Employees"),
  attendance:     () => pickEnv("AIRTABLE_FACTORYOS_ATTENDANCE_TABLE",  "AIRTABLE_ORDERS_ATTENDANCE_TABLE",  "Attendance"),
  coatingJobs:    () => pickEnv("AIRTABLE_FACTORYOS_COATING_TABLE",     "AIRTABLE_ORDERS_COATING_TABLE",     "Coating Jobs"),
  vendors:        () => pickEnv("AIRTABLE_FACTORYOS_VENDORS_TABLE",    "AIRTABLE_ORDERS_VENDORS_TABLE",     "Vendors"),
};

export function escapeFormula(v) {
  return String(v).replace(/'/g, "\\'");
}
