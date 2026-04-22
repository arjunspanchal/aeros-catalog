// Read-only client for the Paper RM Database — the master paper catalogue.
// Lives in a dedicated Airtable base (default: appSllndIZszJSCma) so the same
// master can be read from multiple Aeros apps (Orders, Rate Calculator, …) via
// the same PAT. Do NOT use this module to write — treat the master as authoritative
// and managed in Airtable's UI.

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

// Average effective cupstock rate (INR/kg) for the given GSM across all
// suppliers in the master. Returns null if no Cupstock row matches that GSM
// or if none of the matches has a Base Rate populated. Callers should fall
// back to their own defaults when null.
export async function getCupstockRateByGsm(gsm) {
  const papers = await listMasterPapers();
  const matches = papers.filter(
    (p) => p.type === "Cupstock" && typeof p.gsm === "number" && p.gsm === Number(gsm)
  );
  const rates = matches
    .map((p) => p.effectiveRate)
    .filter((r) => typeof r === "number" && Number.isFinite(r));
  if (rates.length === 0) return null;
  const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
  return Math.round(avg * 100) / 100;
}

// Bulk version — returns { gsm → rate } for each GSM asked about, one Airtable
// fetch. Use this when the caller needs rates for multiple GSMs in the same
// request (e.g. inner + outer + bottom).
export async function getCupstockRatesByGsms(gsms) {
  const unique = Array.from(new Set(gsms.map((g) => Number(g)).filter(Boolean)));
  const papers = await listMasterPapers();
  const out = {};
  for (const g of unique) {
    const matches = papers.filter((p) => p.type === "Cupstock" && p.gsm === g);
    const rates = matches.map((p) => p.effectiveRate).filter((r) => typeof r === "number" && Number.isFinite(r));
    out[g] = rates.length ? Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 100) / 100 : null;
  }
  return out;
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
