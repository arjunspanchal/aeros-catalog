#!/usr/bin/env node
/**
 * Re-import the rows accidentally deleted by my SQL `LIKE '__%'` mistake.
 * Pulls from Airtable (still intact) into Supabase. Rebuilds:
 *   master_papers, bag_specs, vendors, jobs (+ status updates)
 *
 * USAGE
 *   node --env-file=.env.local scripts/restore-from-airtable.js
 */

"use strict";

const AT = "https://api.airtable.com/v0";
const TOKEN = process.env.AIRTABLE_TOKEN;
const ORDERS = process.env.AIRTABLE_ORDERS_BASE_ID;
const PAPER_RM = process.env.AIRTABLE_PAPER_RM_BASE_ID || "appSllndIZszJSCma";
const CALC = process.env.AIRTABLE_CALC_BASE_ID;
const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function airtableList(baseId, tableName) {
  const out = [];
  let offset;
  do {
    const url = new URL(`${AT}/${baseId}/${encodeURIComponent(tableName)}`);
    url.searchParams.set("pageSize", "100");
    if (offset) url.searchParams.set("offset", offset);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (!res.ok) throw new Error(`Airtable ${tableName} ${res.status}: ${await res.text()}`);
    const json = await res.json();
    out.push(...json.records);
    offset = json.offset;
  } while (offset);
  return out;
}

async function sbUpsert(table, rows, onConflict = "airtable_id") {
  if (!rows.length) return [];
  const out = [];
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const url = new URL(`${SB_URL}/rest/v1/${table}`);
    if (onConflict) url.searchParams.set("on_conflict", onConflict);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        apikey: SB_KEY,
        Authorization: `Bearer ${SB_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation,resolution=merge-duplicates",
      },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) throw new Error(`Upsert ${table} ${res.status}: ${await res.text()}`);
    out.push(...(await res.json()));
  }
  return out;
}

async function sbSelect(table, columns) {
  const url = new URL(`${SB_URL}/rest/v1/${table}`);
  url.searchParams.set("select", columns);
  const res = await fetch(url, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, Range: "0-9999" },
  });
  if (!res.ok) throw new Error(`Select ${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

const blank = (v) => v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
const num = (v) => { if (blank(v)) return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
const int = (v) => { const n = num(v); return n === null ? null : Math.trunc(n); };
const bool = (v) => blank(v) ? null : Boolean(v);
const str = (v) => blank(v) ? null : String(v);
const dateOnly = (v) => blank(v) ? null : String(v).slice(0, 10);
const selectName = (v) => {
  if (blank(v)) return null;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v[0]?.name ?? v[0] ?? null;
  if (typeof v === "object" && v.name) return v.name;
  return null;
};
const firstLink = (arr) => Array.isArray(arr) && arr.length ? arr[0] : null;

(async () => {
  console.log("\n▶ master_papers");
  const masterPaperRecs = await airtableList(PAPER_RM, "Raw Materials");
  await sbUpsert("master_papers", masterPaperRecs.map((r) => {
    const f = r.fields;
    return {
      airtable_id: r.id,
      material_name: str(f["Material Name"]) ?? `__unnamed_${r.id}`,
      type: str(f.Type),
      gsm: num(f.GSM),
      bf: num(f.BF),
      supplier: str(f.Supplier),
      form: selectName(f.Form),
      mill_coating: selectName(f["Mill Coating"]),
      base_rate_inr_kg: num(f["Base Rate (INR/kg)"]),
      discount_inr_kg: num(f["Discount (INR/kg)"]),
      specifications: str(f.Specifications),
      raw_fields: f,
    };
  }));
  console.log(`  ${masterPaperRecs.length} restored`);

  console.log("\n▶ bag_specs");
  const bagSpecRecs = await airtableList(CALC, "Bag Specs");
  await sbUpsert("bag_specs", bagSpecRecs.map((r) => {
    const f = r.fields;
    return {
      airtable_id: r.id,
      code: str(f.Code),
      brand: str(f.Brand),
      item: str(f.Item),
      bag_type: selectName(f["Bag Type"]),
      width_mm: num(f["Width mm"]),
      gusset_mm: num(f["Gusset mm"]),
      height_mm: num(f["Height mm"]),
      paper_type: selectName(f["Paper Type"]),
      mill: selectName(f.Mill),
      gsm: num(f.GSM),
      bf: num(f.BF),
      case_pack: int(f["Case Pack"]),
      printing: bool(f.Printing),
      colours: int(f.Colours),
      coverage_pct: int(f["Coverage %"]),
      locked_wastage_pct: num(f["Locked Wastage %"]),
      raw_fields: f,
    };
  }));
  console.log(`  ${bagSpecRecs.length} restored`);

  console.log("\n▶ vendors");
  const vendorRecs = await airtableList(ORDERS, "Vendors");
  await sbUpsert("vendors", vendorRecs.map((r) => {
    const f = r.fields;
    return {
      airtable_id: r.id,
      name: str(f.Name) ?? `__unnamed_${r.id}`,
      type: selectName(f.Type),
      contact_person: str(f["Contact Person"]),
      phone: str(f.Phone),
      email: str(f.Email)?.toLowerCase() ?? null,
      active: bool(f.Active) ?? true,
      notes: str(f.Notes),
      raw_fields: f,
    };
  }));
  console.log(`  ${vendorRecs.length} restored`);

  console.log("\n▶ jobs");
  // Need lookup: airtable client_id → PG client uuid
  const clientRows = await sbSelect("clients", "id,airtable_id");
  const clientMap = new Map(clientRows.filter((r) => r.airtable_id).map((r) => [r.airtable_id, r.id]));
  const userRows = await sbSelect("users", "id,airtable_id");
  const userMap = new Map(userRows.filter((r) => r.airtable_id).map((r) => [r.airtable_id, r.id]));
  const productRows = await sbSelect("master_products", "id,sku");
  const productMap = new Map(productRows.filter((r) => r.sku).map((r) => [r.sku, r.id]));

  const jobRecs = await airtableList(ORDERS, "Jobs");
  await sbUpsert("jobs", jobRecs.map((r) => {
    const f = r.fields;
    const masterSku = str(f["Master SKU"]);
    return {
      airtable_id: r.id,
      j_number: str(f["J#"]) ?? `__missing_${r.id}`,
      client_id: clientMap.get(firstLink(f.Client)) ?? null,
      brand: str(f.Brand),
      master_sku: masterSku,
      master_product_id: masterSku ? (productMap.get(masterSku) ?? null) : null,
      master_product_name: str(f["Master Product Name"]),
      customer_manager_id: userMap.get(firstLink(f["Customer Manager"])) ?? null,
      category: selectName(f.Category),
      item: str(f.Item),
      item_size: str(f["Item Size"]),
      city: str(f.City),
      qty: int(f.Qty),
      order_date: dateOnly(f["Order Date"]),
      expected_dispatch_date: dateOnly(f["Expected Dispatch Date"]),
      estimated_delivery_date: dateOnly(f["Estimated Delivery Date"]),
      stage: selectName(f.Stage) ?? "RM Pending",
      internal_status: str(f["Internal Status"]),
      po_number: str(f["PO Number"]),
      rm_type: str(f["RM Type"]),
      rm_supplier: str(f["RM Supplier"]),
      paper_type: str(f["Paper Type"]),
      gsm: num(f.GSM),
      rm_size_mm: num(f["RM Size (mm)"]),
      rm_qty_sheets: num(f["RM Qty (Sheets)"]),
      rm_qty_kgs: num(f["RM Qty (kgs)"]),
      rm_delivery_date: dateOnly(f["RM Delivery Date"]),
      printing_type: selectName(f["Printing Type"]),
      printing_vendor: str(f["Printing Vendor"]),
      printing_due_date: dateOnly(f["Printing Due Date"]),
      production_due_date: dateOnly(f["Production Due Date"]),
      action_points: str(f["Action Points"]),
      notes: str(f.Notes),
      urgent: bool(f.Urgent) ?? false,
      transport_mode: selectName(f["Transport Mode"]),
      lr_or_vehicle_number: str(f["LR / Vehicle Number"]),
      driver_contact: str(f["Driver Contact"]),
      raw_fields: f,
    };
  }));
  console.log(`  ${jobRecs.length} restored`);

  console.log("\n▶ job_status_updates");
  const jobsAgain = await sbSelect("jobs", "id,airtable_id");
  const jobMap = new Map(jobsAgain.filter((r) => r.airtable_id).map((r) => [r.airtable_id, r.id]));

  const updateRecs = await airtableList(ORDERS, "Job Status Updates");
  const updates = updateRecs.map((r) => {
    const f = r.fields;
    const jobId = jobMap.get(firstLink(f.Job)) ?? null;
    if (!jobId) return null;
    return {
      airtable_id: r.id,
      job_id: jobId,
      stage: selectName(f.Stage),
      note: str(f.Note),
      updated_by_email: str(f["Updated By Email"])?.toLowerCase() ?? null,
      updated_by_name: str(f["Updated By Name"]),
      raw_fields: f,
    };
  }).filter(Boolean);
  await sbUpsert("job_status_updates", updates);
  console.log(`  ${updates.length} restored`);

  console.log("\n✓ All accidentally-deleted tables restored.");
})().catch((err) => {
  console.error("\nFAILED:", err.message);
  process.exit(1);
});
