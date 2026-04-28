// Reads paper RM rates live from the "Paper RM Database" base on Airtable.
// Normalises into a { supplier: { gsm: { bf: { baseRate, discount } } } } shape
// that the calculator can index without scanning rows. Cached for 5 minutes via
// Next.js fetch revalidation so frequent rate calls don't hammer the Airtable API.
//
// If Airtable is unreachable or the env vars are missing, the caller should fall
// back to the static tables in lib/calc/calculator.js — this lib never throws.

const AIRTABLE_API = "https://api.airtable.com/v0";
const RM_TABLE = "Raw Materials";
const PAPER_TYPES = ["Brown Kraft", "Bleach Kraft White", "OGR"];

function env(k) {
  return process.env[k];
}

// Paper RM base + token. Project already has scoped PATs per-base; fall back to
// the legacy AIRTABLE_TOKEN if the scoped name isn't set.
function rmToken() {
  return env("AIRTABLE_PAT_PAPER_RM") || env("AIRTABLE_TOKEN");
}
function rmBaseId() {
  return env("AIRTABLE_PAPER_RM_BASE_ID") || env("AIRTABLE_RM_BASE_ID");
}

// Normalise supplier names from Airtable to the spelling our calculator uses.
const SUPPLIER_ALIAS = {
  "Jodhani Mill": "Jodhani",
  "Om Shivaay": "Om Shivaay",
  "Pudumjee": "Pudumjee",
  "BILT": "BILT",
  "JK": "JK",
  "Ajit": "Ajit",
};

function normalisedSupplier(raw) {
  if (!raw) return null;
  const trimmed = raw.trim();
  return SUPPLIER_ALIAS[trimmed] || trimmed;
}

/**
 * Fetch paper RM rates from Airtable and return them as nested tables.
 * Shape:
 *   {
 *     bySupplier: { "Jodhani": { 100: { 28: { baseRate: 48.5, discount: 4 } } }, ... },
 *     byPaperType: { "Brown Kraft": [{supplier, gsm, bf, baseRate, discount}, ...], ... },
 *   }
 *
 * Returns null on any failure (caller falls back to static tables).
 */
export async function fetchPaperRMTables() {
  const token = rmToken();
  const baseId = rmBaseId();
  if (!token || !baseId) return null;

  const url = new URL(`${AIRTABLE_API}/${baseId}/${encodeURIComponent(RM_TABLE)}`);
  // Pull only paper-bag-relevant rows. Cupstock is for cups/tubs and skipped.
  const filter = `OR(${PAPER_TYPES.map((t) => `{Type}='${t}'`).join(",")})`;
  url.searchParams.set("filterByFormula", filter);
  url.searchParams.set("pageSize", "100");

  let records = [];
  let offset;
  try {
    do {
      if (offset) url.searchParams.set("offset", offset);
      else url.searchParams.delete("offset");
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
        next: { revalidate: 300 },
      });
      if (!res.ok) return null;
      const data = await res.json();
      records.push(...data.records);
      offset = data.offset;
    } while (offset);
  } catch {
    return null;
  }

  const bySupplier = {};
  const byPaperType = { "Brown Kraft": [], "Bleach Kraft White": [], "OGR": [] };

  for (const rec of records) {
    const f = rec.fields || {};
    const paperType = f.Type;
    const supplier = normalisedSupplier(f.Supplier);
    const gsm = Number(f.GSM);
    const bf = f.BF !== undefined ? Number(f.BF) : null;
    const baseRate = Number(f["Base Rate (INR/kg)"]);
    const discount = Number(f["Discount (INR/kg)"] || 0);
    if (!supplier || !baseRate || !PAPER_TYPES.includes(paperType)) continue;

    // Index by supplier+gsm+bf for fast direct lookup.
    if (gsm) {
      bySupplier[supplier] = bySupplier[supplier] || {};
      bySupplier[supplier][gsm] = bySupplier[supplier][gsm] || {};
      const bfKey = bf || 0; // 0 means "no specific BF" (e.g. Bleach/OGR rolls)
      bySupplier[supplier][gsm][bfKey] = { baseRate, discount };
    }

    byPaperType[paperType].push({ supplier, gsm: gsm || null, bf, baseRate, discount });
  }

  return { bySupplier, byPaperType };
}

const JODHANI_DISCOUNT = 4;
const DEFAULT_TRANSPORT = 5;

/**
 * Resolve the effective ₹/kg paper rate for a given spec, using live RM data.
 * Returns null if no live row matches; caller can then fall back to the static
 * lookupPaperRate in calculator.js.
 *
 * @param {object} tables  result of fetchPaperRMTables()
 * @param {object} spec    { paperType, mill, gsm, bf }
 * @param {object} opts    { transport: number, wetStrength: boolean }
 */
export function lookupRMPaperRate(tables, { paperType, mill, gsm, bf }, opts = {}) {
  if (!tables) return null;
  const transport = opts.transport ?? DEFAULT_TRANSPORT;
  const wet = opts.wetStrength ? 5 : 0;

  // Try the explicit supplier first.
  let pick = mill && tables.bySupplier[mill]?.[gsm]?.[bf || 0];

  // For Brown Kraft when no mill given, try Jodhani then Om Shivaay (the two
  // mills the calculator already prefers as defaults).
  if (!pick && !mill && paperType === "Brown Kraft") {
    pick = tables.bySupplier["Jodhani"]?.[gsm]?.[bf || 0]
        || tables.bySupplier["Om Shivaay"]?.[gsm]?.[bf || 0];
  }

  // Last resort: any supplier in the same paper type matching gsm+bf.
  if (!pick) {
    const candidates = (tables.byPaperType[paperType] || [])
      .filter((r) => (!gsm || r.gsm === gsm) && (!bf || !r.bf || r.bf === bf));
    if (candidates.length) pick = { baseRate: candidates[0].baseRate, discount: candidates[0].discount };
  }

  if (!pick) return null;
  // Effective formula matches the existing static-table logic: base − discount + transport.
  const effective = pick.baseRate - pick.discount + transport;
  return Math.round((effective + wet) * 100) / 100;
}
