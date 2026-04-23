// Client for the Paper RM Database — the master paper catalogue.
// Lives in a dedicated Airtable base (default: appSllndIZszJSCma) so the same
// master can be read from multiple Aeros apps (FactoryOS, Rate Calculator, …)
// via the same PAT. Most reads are public; writes are admin-only and gated at
// the API layer (see app/api/factoryos/master-papers/[id]/route.js).

const API = "https://api.airtable.com/v0";

function env(k, fallback) {
  const v = process.env[k];
  if (v) return v;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing env var: ${k}`);
}

function baseUrl() {
  const base = env("AIRTABLE_PAPER_RM_BASE_ID", "appSllndIZszJSCma");
  const table = env("AIRTABLE_PAPER_RM_TABLE", "Raw Materials");
  return `${API}/${base}/${encodeURIComponent(table)}`;
}

function headers() {
  return {
    Authorization: `Bearer ${env("AIRTABLE_TOKEN")}`,
    "Content-Type": "application/json",
  };
}

// Patch a master paper row — only the rate-related fields are writable here,
// everything else is managed in Airtable's UI. Keeping the whitelist narrow means
// a compromised session can't silently retype the catalogue.
export async function updateMasterPaper(id, fields) {
  if (!id) throw new Error("Master paper id required");
  const patch = {};
  if (fields.baseRate !== undefined) {
    patch["Base Rate (INR/kg)"] = fields.baseRate === null || fields.baseRate === "" ? null : Number(fields.baseRate);
  }
  if (fields.discount !== undefined) {
    patch["Discount (INR/kg)"] = fields.discount === null || fields.discount === "" ? null : Number(fields.discount);
  }
  if (!Object.keys(patch).length) {
    throw new Error("No editable fields in patch");
  }
  const res = await fetch(`${baseUrl()}/${id}`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify({ fields: patch, typecast: true }),
  });
  if (!res.ok) throw new Error(`Paper RM update failed: ${res.status} ${await res.text()}`);
  return normMasterPaper(await res.json());
}

export async function listMasterPapers() {
  const url = new URL(baseUrl());
  url.searchParams.set("sort[0][field]", "Material Name");
  const records = [];
  let offset;
  do {
    if (offset) url.searchParams.set("offset", offset);
    const res = await fetch(url.toString(), { headers: headers(), cache: "no-store" });
    if (!res.ok) throw new Error(`Paper RM list failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    records.push(...data.records);
    offset = data.offset;
  } while (offset);
  return records.map(normMasterPaper);
}

function normMasterPaper(row) {
  const f = row.fields || {};
  const baseRate = typeof f["Base Rate (INR/kg)"] === "number" ? f["Base Rate (INR/kg)"] : null;
  const discount = typeof f["Discount (INR/kg)"] === "number" ? f["Discount (INR/kg)"] : null;
  return {
    id: row.id,
    materialName: f["Material Name"] || "",
    gsm: typeof f.GSM === "number" ? f.GSM : null,
    bf: typeof f.BF === "number" ? f.BF : null,
    type: f.Type || "",
    supplier: f.Supplier || "",
    form: f.Form || "",
    baseRate,
    discount,
    // Effective rate after the supplier's standard discount.
    // Transport / wet-strength surcharges are calculator concerns and live elsewhere.
    effectiveRate: baseRate != null ? baseRate - (discount || 0) : null,
    specifications: f.Specifications || "",
  };
}
