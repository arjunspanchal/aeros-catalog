// Master paper catalogue. Reads + writes go to Supabase `master_papers`.
// Admin UI gets full CRUD via this module.

import { airtableList, airtableGet, airtableCreate, airtableUpdate, airtableDelete } from "./db/airtableShim.js";

function normMasterPaper(record) {
  const f = record.fields || {};
  const baseRate = typeof f["Base Rate (INR/kg)"] === "number" ? f["Base Rate (INR/kg)"] : null;
  const discount = typeof f["Discount (INR/kg)"] === "number" ? f["Discount (INR/kg)"] : null;
  return {
    id: record.id,
    materialName: f["Material Name"] || "",
    gsm: typeof f.GSM === "number" ? f.GSM : null,
    bf: typeof f.BF === "number" ? f.BF : null,
    type: f.Type || "",
    supplier: f.Supplier || "",
    form: f.Form || "",
    millCoating: f["Mill Coating"] || "",
    baseRate,
    discount,
    effectiveRate: typeof f["Effective Rate (INR/kg)"] === "number"
      ? f["Effective Rate (INR/kg)"]
      : (baseRate != null ? baseRate - (discount || 0) : null),
    specifications: f.Specifications || "",
  };
}

export async function listMasterPapers() {
  const records = await airtableList("Raw Materials", { sort: [{ field: "Material Name", direction: "asc" }] });
  return records.map(normMasterPaper);
}

const EDITABLE_FIELDS = new Set([
  "materialName", "type", "gsm", "bf", "supplier", "form",
  "millCoating", "baseRate", "discount", "specifications",
]);

function toAirtableFields(draft) {
  const out = {};
  const text = (k, key) => {
    if (!EDITABLE_FIELDS.has(key)) return;
    if (draft[key] !== undefined) out[k] = draft[key] === "" || draft[key] == null ? null : String(draft[key]);
  };
  const num = (k, key) => {
    if (!EDITABLE_FIELDS.has(key)) return;
    if (draft[key] !== undefined) {
      const v = draft[key];
      out[k] = v === "" || v == null ? null : Number(v);
    }
  };
  text("Material Name", "materialName");
  text("Type", "type");
  num("GSM", "gsm");
  num("BF", "bf");
  text("Supplier", "supplier");
  text("Form", "form");
  text("Mill Coating", "millCoating");
  num("Base Rate (INR/kg)", "baseRate");
  num("Discount (INR/kg)", "discount");
  text("Specifications", "specifications");
  return out;
}

export async function createMasterPaper(draft) {
  if (!draft?.materialName) throw new Error("materialName is required");
  const rec = await airtableCreate("Raw Materials", toAirtableFields(draft));
  return normMasterPaper(rec);
}

export async function updateMasterPaper(id, draft) {
  if (!id) throw new Error("Master paper id required");
  const fields = toAirtableFields(draft);
  if (!Object.keys(fields).length) throw new Error("No editable fields in patch");
  const rec = await airtableUpdate("Raw Materials", id, fields);
  return normMasterPaper(rec);
}

export async function deleteMasterPaper(id) {
  if (!id) throw new Error("Master paper id required");
  return airtableDelete("Raw Materials", id);
}
