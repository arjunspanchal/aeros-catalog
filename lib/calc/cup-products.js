// Fetch Paper Cup products from Aeros Products Master and bucket them by oz
// size + wall type so the customer calculator can offer real SKU-backed
// dimensions instead of hardcoded defaults.
//
// The engine's SW_DIMS table has fan geometry for 8/12/16/20oz buckets only.
// Products whose Size/Volume string matches one of those oz values get
// surfaced; ml-only cups are filtered out (the engine has no bucket for them).

import { fetchCatalog } from "@/lib/catalog";

const OZ_BUCKETS = ["8oz", "12oz", "16oz", "20oz"];

// Parse "8oz / 250ml" or "8oz" → "8oz". Case-insensitive; prefers leading oz
// (so "10oz" won't match "20oz"). Returns null if no supported bucket.
function extractOzBucket(sizeVolume) {
  if (!sizeVolume) return null;
  const m = String(sizeVolume).match(/(\d+)\s*oz/i);
  if (!m) return null;
  const bucket = `${parseInt(m[1], 10)}oz`;
  return OZ_BUCKETS.includes(bucket) ? bucket : null;
}

// Normalize wall type strings.
function normalizeWallType(wt) {
  if (!wt) return null;
  const t = String(wt).trim();
  if (/single/i.test(t)) return "Single Wall";
  if (/double/i.test(t)) return "Double Wall";
  if (/ripple/i.test(t)) return "Ripple";
  return null;
}

// Extract the variant label from Size / Volume or Product Name. "(Squat)",
// "(Tall)", "(Delux)" etc. Returns "Standard" when no qualifier found.
function extractVariant(sizeVolume, productName) {
  const haystack = `${sizeVolume || ""} ${productName || ""}`;
  if (/\bsquat\b/i.test(haystack)) return "Squat";
  if (/\btall\b/i.test(haystack)) return "Tall";
  if (/\bdelu[xk]\b/i.test(haystack)) return "Deluxe";
  if (/\bwide\b/i.test(haystack)) return "Wide";
  return "Standard";
}

export async function fetchCupDimOptions() {
  const products = await fetchCatalog();
  const cups = products.filter((p) => p.category === "Paper Cups");

  // { [wallType]: { [bucket]: [{ td, bd, h, sku, productName, variant, casePack, cartonDimensions }] } }
  const out = {};
  for (const p of cups) {
    const bucket = extractOzBucket(p.sizeVolume);
    const wallType = normalizeWallType(p.wallType);
    if (!bucket || !wallType) continue;
    if (!p.topDiameter || !p.bottomDiameter || !p.heightMm) continue;

    if (!out[wallType]) out[wallType] = {};
    if (!out[wallType][bucket]) out[wallType][bucket] = [];
    out[wallType][bucket].push({
      td: p.topDiameter,
      bd: p.bottomDiameter,
      h: p.heightMm,
      sku: p.sku,
      productName: p.productName,
      variant: extractVariant(p.sizeVolume, p.productName),
      casePack: p.unitsPerCase || null,
      cartonDimensions: p.cartonDimensions || "",
    });
  }

  // Stable order: Standard first, then other variants by height ascending.
  const variantWeight = (v) => (v === "Standard" ? 0 : 1);
  for (const wt of Object.keys(out)) {
    for (const b of Object.keys(out[wt])) {
      out[wt][b].sort((a, b) => {
        const w = variantWeight(a.variant) - variantWeight(b.variant);
        return w !== 0 ? w : a.h - b.h;
      });
    }
  }
  return out;
}
