// Aeros Paper Bag Rate Calculator — pure calculation engine.
// Ported from the TPC spreadsheet formulas. No framework deps.

export const GLUE_GSM = 30.0;
export const GLUE_RATE_PER_KG = 300.0;
export const CASE_PACKING_RATE_PER_BOX = 80.0;
export const CONVERSION_RATE = { sos: 10, rope_handle: 20, flat_handle: 20, v_bottom_gusset: 10 };
export const PLATE_COST_PER_COLOUR = 5000;
export const PRINTING_RATES = { 10: 7, 30: 10, 100: 15 };
export const USD_RATE = 90;
export const JODHANI_DISCOUNT = 4;
export const WET_STRENGTH_EXTRA = 5;

// Handle bags come in two variants. Cost differs because of the handle material itself
// (twisted rope vs. flat paper patti). Geometry, labour, wastage are identical.
export const HANDLE_DEFAULT_COST = { rope_handle: 0.85, flat_handle: 1.0 };

export const BAG_TYPE_LABEL = {
  sos: "SOS",
  rope_handle: "Rope Handle",
  flat_handle: "Flat Handle",
  v_bottom_gusset: "V-Bottom",
};

export const isHandleBag = (bt) => bt === "rope_handle" || bt === "flat_handle";

export const JODHANI_RATES = {
  "100": { 24: 45.5, 26: 47, 28: 48.5 }, "110": { 24: 45.5, 26: 47, 28: 48.5 },
  "120": { 24: 45.5, 26: 47, 28: 48.5 }, "130": { 24: 45.5, 26: 47, 28: 48.5 },
  "140": { 24: 45.5, 26: 47, 28: 48.5 }, "90": { 24: 47, 26: 48.5, 28: 50 },
  "82": { 24: 48.5, 26: 50, 28: 51.5 },
};

export const OM_SHIVAAY_RATES = { "70": { 28: 52 }, "60": { 28: 55 } };

export const QTY_TIERS = [15000, 30000, 50000, 100000, 250000];

export function getJodhaniRate(bucket, bf) {
  if (!bucket || !bf) return null;
  return JODHANI_RATES[bucket]?.[bf] ?? null;
}

export function getOmShivaayRate(gsm, bf) {
  return OM_SHIVAAY_RATES[String(gsm)]?.[parseInt(bf)] ?? null;
}

export function getDefaultWastage(bagType) {
  if (bagType === "sos") return 10;
  if (isHandleBag(bagType)) return 7;
  return 5;
}

export function getPastingWidth(widthMm) {
  return widthMm <= 100 ? 15 : widthMm <= 300 ? 20 : 25;
}

export function getJodhaniGsmBucket(gsm) {
  const g = parseInt(gsm);
  if (g >= 100 && g <= 140) {
    const rounded = Math.round(g / 10) * 10;
    return String(rounded <= 140 ? rounded : 140);
  }
  if (g >= 83) return "90";
  return "82";
}

const round4 = (v) => Math.round(v * 10000) / 10000;

// Rough estimate of the packing carton's outer dimensions in mm. Based on how the bags
// lie flat in a box plus a small padding allowance. Real cartons vary by converter;
// treat these as a sanity-check, not a procurement spec.
//   L ≈ bag height + pad
//   W ≈ bag width  + ~1/3 of gusset (flattened side-fold) + pad
//   D ≈ per-bag flat thickness × casePack + pad
// Per-bag thickness depends on GSM and how many paper layers stack at the thickest point:
//   SOS            → 4 layers (front, back, two side-gussets)
//   Handle bags    → 5 layers (handle loop adds one)
//   V-Bottom       → 6 layers (base pleat)
export function approxBoxDimensions(f) {
  if (!f.casePack || !f.gsm || !f.width || !f.height) return null;
  const pad = 20;
  const folds = f.bagType === "v_bottom_gusset" ? 6 : (isHandleBag(f.bagType) ? 5 : 4);
  const perBagMm = (f.gsm / 1000) * folds * 1.6;
  const L = Math.round(f.height + pad);
  const W = Math.round(f.width + f.gusset * 0.3 + pad);
  const D = Math.round(perBagMm * f.casePack + pad);
  return { L, W, D };
}

// Core calculation. Input object is plain numbers/booleans; output is the full breakdown.
export function calculate(f) {
  const pw = getPastingWidth(f.width);
  const rw = f.width * 2 + f.gusset * 2 + pw;
  const th = f.bagType === "v_bottom_gusset" ? f.height + 15 : f.height + f.gusset * 0.75;
  const area = rw * th;
  const wkg = (area * f.gsm) / 1_000_000_000;
  const paperCost = wkg * f.paperRate;

  const sg = (th * pw * GLUE_GSM) / 1_000_000_000;
  const bg = f.bagType === "v_bottom_gusset"
    ? (f.width * 15 * GLUE_GSM) / 1_000_000_000
    : (0.25 * f.width * f.gusset * GLUE_GSM) / 1_000_000_000;
  const tg = sg + bg;
  const glueCost = tg * GLUE_RATE_PER_KG;

  const cpCost = CASE_PACKING_RATE_PER_BOX / f.casePack;

  const wastage = f.customWastage !== "" && f.customWastage !== undefined && f.customWastage !== null
    ? parseFloat(f.customWastage)
    : getDefaultWastage(f.bagType);
  const wastageCost = (wastage / 100) * wkg * f.paperRate;

  const convRate = CONVERSION_RATE[f.bagType];
  const labourCost = convRate * wkg;

  const handleCost = isHandleBag(f.bagType)
    ? (f.handleCost !== undefined && f.handleCost !== null && f.handleCost !== "" ? Number(f.handleCost) : HANDLE_DEFAULT_COST[f.bagType])
    : 0;

  const printRate = f.printing && f.coverage ? (PRINTING_RATES[f.coverage] ?? 0) : 0;
  const printCost = wkg * printRate;
  const plateCost = f.printing ? (f.colours || 0) * PLATE_COST_PER_COLOUR : 0;

  const totalMfg = labourCost + wastageCost + cpCost + glueCost + paperCost + handleCost + printCost;

  const profitPct = f.profitPercent > 0 ? f.profitPercent : 10;
  const profit = (profitPct / 100) * totalMfg;
  const sellingPrice = totalMfg + profit;

  return {
    pw: round4(pw), rw: round4(rw), th: round4(th), area: round4(area),
    wkg: round4(wkg), paperCost: round4(paperCost),
    sg: round4(sg), bg: round4(bg), tg: round4(tg), glueCost: round4(glueCost),
    cpCost: round4(cpCost),
    wastage: round4(wastage), wastageCost: round4(wastageCost),
    convRate, labourCost: round4(labourCost),
    handleCost: round4(handleCost),
    printRate, printCost: round4(printCost), plateCost,
    totalMfg: round4(totalMfg),
    profitPct: round4(profitPct), profit: round4(profit),
    sellingPrice: round4(sellingPrice),
    box: approxBoxDimensions(f),
  };
}

// Rate curve: given a single calculated breakdown, compute selling price at each qty tier.
// Plate cost amortisation is the volume-dependent piece (printed bags only). Per-unit mfg
// cost gets += plateCost/qty, then margin is applied.
export function computeRateCurve(baseInputs, tiers = QTY_TIERS) {
  const base = calculate(baseInputs);
  return tiers.map((qty) => {
    const plateAmortised = base.plateCost > 0 ? base.plateCost / qty : 0;
    const mfgPerBag = base.totalMfg + plateAmortised;
    const profit = (baseInputs.profitPercent / 100) * mfgPerBag;
    const ratePerBag = mfgPerBag + profit;
    return {
      qty,
      mfgPerBag: round4(mfgPerBag),
      plateAmortised: round4(plateAmortised),
      ratePerBag: round4(ratePerBag),
      orderTotal: Math.round(ratePerBag * qty * 100) / 100,
      costPerCase: Math.round(ratePerBag * baseInputs.casePack * 100) / 100,
    };
  });
}

// Default paper rate lookup for client-facing use. Clients never pick a mill —
// the server decides which supplier's rate to apply based on paper type + GSM +
// BF. Brown Kraft tries Jodhani first (their GSM/BF table covers 82–140 at 24/26/28),
// then Om Shivaay (60 and 70 GSM at 28 BF), then a flat fallback.
export function lookupPaperRate({ paperType, mill, gsm, bf }) {
  const bfInt = parseInt(bf);
  if (mill === "Jodhani" || (!mill && paperType === "Brown Kraft")) {
    const bucket = getJodhaniGsmBucket(gsm);
    const base = getJodhaniRate(bucket, bfInt);
    if (base) return Math.round((base - JODHANI_DISCOUNT + WET_STRENGTH_EXTRA) * 100) / 100;
  }
  if (mill === "Om Shivaay" || (!mill && paperType === "Brown Kraft")) {
    const rate = getOmShivaayRate(gsm, bf);
    if (rate) return rate;
  }
  if (paperType === "Brown Kraft") return 55;
  if (paperType === "Bleach Kraft White") return 130;
  if (paperType === "OGR") return 125;
  return 60;
}

export function optimizationTips(f, result) {
  const tips = [];
  if (f.gsm > 100) tips.push("Reducing GSM can lower paper cost if bag strength allows.");
  if (f.casePack < 100) tips.push("Increasing case pack reduces packing cost per bag.");
  if (f.printing && f.coverage === 100) tips.push("100% coverage significantly increases print cost.");
  if (f.printing && f.colours > 2)
    tips.push(`${f.colours} colours = ₹${(f.colours * PLATE_COST_PER_COLOUR).toLocaleString()} in plate costs.`);
  if (isHandleBag(f.bagType)) tips.push("Handle cost strongly affects pricing; switching rope↔flat can change the margin.");
  if (result.pw === 25) tips.push("Large bag width triggers higher pasting width; review dimensions.");
  if (!tips.length) tips.push("Current inputs are fairly efficient. Main savings: GSM, paper rate, case pack.");
  return tips;
}
