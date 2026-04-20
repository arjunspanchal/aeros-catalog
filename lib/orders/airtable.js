// Thin Airtable REST client scoped to the Orders base. Server-side only.

const API = "https://api.airtable.com/v0";

function env(k) {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env var: ${k}`);
  return v;
}

function baseUrl(table) {
  const base = env("AIRTABLE_ORDERS_BASE_ID");
  return `${API}/${base}/${encodeURIComponent(table)}`;
}

function headers() {
  return {
    Authorization: `Bearer ${env("AIRTABLE_TOKEN")}`,
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

export const TABLES = {
  clients: () => process.env.AIRTABLE_ORDERS_CLIENTS_TABLE || "Clients",
  users: () => process.env.AIRTABLE_ORDERS_USERS_TABLE || "Users",
  jobs: () => process.env.AIRTABLE_ORDERS_JOBS_TABLE || "Jobs",
  updates: () => process.env.AIRTABLE_ORDERS_UPDATES_TABLE || "Job Status Updates",
  otp: () => process.env.AIRTABLE_ORDERS_OTP_TABLE || "OTP Codes",
  customerPOs: () => process.env.AIRTABLE_ORDERS_CUSTOMER_POS_TABLE || "Customer POs",
  rawMaterials: () => process.env.AIRTABLE_ORDERS_RM_TABLE || "RM Inventory",
  rmReceipts: () => process.env.AIRTABLE_ORDERS_RM_RECEIPTS_TABLE || "RM Receipts",
};

export function escapeFormula(v) {
  return String(v).replace(/'/g, "\\'");
}
