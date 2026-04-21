// Aeros Custom Box Rate Calculator — pure calculation engine.
// Sibling of lib/calc/calculator.js (paper bags). Shares the Airtable Calculator
// base, the /calculator/* auth flow, and the QTY_TIERS / margin conventions.
//
// Box construction differs from bags: open-size blank die-cut from a sheet, then
// (for clam/boat/burger) corner/side pasting. Conversion rates are shop-floor
// rates confirmed 2026-04-21 — see memory/aeros_box_types.md for the story.

// --- Shop-floor rates (2026-04-21) ---
export const DIE_CUT_PER_1000 = 350;        // ₹ per 1000 pieces, applies to all box types
export const PASTING_PER_KG = 15;           // ₹/kg, 4-corner (clam/boat) and 8-side (burger) are the same rate
export const PLATE_COST_PER_COLOUR = 5000;  // ₹ per colour, amortised over qty
export const PRINTING_RATES = { 10: 7, 30: 10, 100: 15 }; // ₹/kg by coverage % (offset)

// Box-type catalogue. Extending this is the main path for adding new box styles.
// `pasted` drives whether PASTING_PER_KG is applied. `defaultWastage` is the
// fallback wastage % when the admin leaves the override blank.
export const BOX_TYPES = {
  cake:   { label: "Cake Box (flat)",   pasted: false, defaultWastage: 5 },
  clam:   { label: "Clam Food Box",     pasted: true,  defaultWastage: 7 },
  boat:   { label: "Boat Tray",         pasted: true,  defaultWastage: 7 },
  burger: { label: "Burger Box",        pasted: true,  defaultWastage: 7 },
  custom: { label: "Custom",            pasted: true,  defaultWastage: 7 },
};

export const BOX_TYPE_LABEL = Object.fromEntries(
  Object.entries(BOX_TYPES).map(([k, v]) => [k, v.label])
);

export const QTY_TIERS = [5000, 10000, 25000, 50000, 100000];

const round4 = (v) => Math.round(v * 10000) / 10000;

export function getDefaultWastage(boxType) {
  return BOX_TYPES[boxType]?.defaultWastage ?? 5;
}

export function isPasted(boxType) {
  return !!BOX_TYPES[boxType]?.pasted;
}

// Core per-box calculation. Geometry is flat open-size (L × W × GSM).
// `qty` is used to amortise plate + punching die costs; computeRateCurve()
// re-runs the amortisation across QTY_TIERS.
export function calculate(f) {
  const L = Number(f.openLength) || 0;
  const W = Number(f.openWidth) || 0;
  const gsm = Number(f.gsm) || 0;
  const paperRate = Number(f.paperRate) || 0;
  const qty = Number(f.qty) || 1;

  // Paper weight per box in kg: (L mm × W mm × GSM g/m²) / 1e9 → kg
  const wkg = (L * W * gsm) / 1_000_000_000;
  const paperCost = wkg * paperRate;

  // Die-cutting (always applied)
  const dieCutCost = DIE_CUT_PER_1000 / 1000;

  // Pasting (clam-forming / 8-side / none)
  const pastingCost = isPasted(f.boxType) ? wkg * PASTING_PER_KG : 0;

  // Printing — ₹/kg by coverage. Plate cost amortised over qty.
  const printRate = f.printing && f.coverage ? (PRINTING_RATES[f.coverage] ?? 0) : 0;
  const printCost = wkg * printRate;
  const plateCostTotal = f.printing ? (Number(f.colours) || 0) * PLATE_COST_PER_COLOUR : 0;
  const plateCostPerBox = plateCostTotal / qty;

  // Punching (optional, separate from die-cut). Die cost amortised; per-piece rate added.
  const punchingDieTotal = f.punching ? (Number(f.punchingDieCost) || 0) : 0;
  const punchingDiePerBox = punchingDieTotal / qty;
  const punchingPerPiece = f.punching ? (Number(f.punchingPerPiece) || 0) : 0;
  const punchingCost = punchingDiePerBox + punchingPerPiece;

  // Inner packing (poly / strapping). `innerPackQty` is boxes per inner pack.
  const innerPackRate = Number(f.innerPackRate) || 0;
  const innerPackQty = Number(f.innerPackQty) || 0;
  const innerPackCost = innerPackQty > 0 ? innerPackRate / innerPackQty : 0;

  // Outer carton. `boxesPerCarton` is how many boxes fit per carton.
  const outerCartonRate = Number(f.outerCartonRate) || 0;
  const boxesPerCarton = Number(f.boxesPerCarton) || 0;
  const outerCartonCost = boxesPerCarton > 0 ? outerCartonRate / boxesPerCarton : 0;

  // Wastage — % of paper cost (same pattern as lib/calc/calculator.js)
  const wastagePct = f.customWastage !== "" && f.customWastage !== undefined && f.customWastage !== null
    ? parseFloat(f.customWastage)
    : getDefaultWastage(f.boxType);
  const wastageCost = (wastagePct / 100) * paperCost;

  const totalMfg =
    paperCost + dieCutCost + pastingCost + printCost +
    plateCostPerBox + punchingCost + innerPackCost + outerCartonCost + wastageCost;

  const profitPct = f.profitPercent > 0 ? f.profitPercent : 10;
  const profit = (profitPct / 100) * totalMfg;
  const sellingPrice = totalMfg + profit;

  return {
    wkg: round4(wkg), paperCost: round4(paperCost),
    dieCutCost: round4(dieCutCost),
    pastingCost: round4(pastingCost),
    printRate, printCost: round4(printCost),
    plateCostTotal, plateCostPerBox: round4(plateCostPerBox),
    punchingCost: round4(punchingCost), punchingDieTotal, punchingPerPiece,
    innerPackCost: round4(innerPackCost),
    outerCartonCost: round4(outerCartonCost),
    wastagePct: round4(wastagePct), wastageCost: round4(wastageCost),
    totalMfg: round4(totalMfg),
    profitPct: round4(profitPct), profit: round4(profit),
    sellingPrice: round4(sellingPrice),
  };
}

// Re-amortise plate + punching die across each qty tier. Paper/pasting/print/
// inner-pack/outer-carton/die-cut are all per-piece so they don't change with qty.
export function computeRateCurve(inputs, tiers = QTY_TIERS) {
  const anchorQty = inputs.qty || tiers[0];
  const base = calculate({ ...inputs, qty: anchorQty });
  return tiers.map((qty) => {
    const plateAmortised = base.plateCostTotal / qty;
    const punchDieAmortised = (base.punchingDieTotal || 0) / qty;
    const baseWithoutAmort =
      base.totalMfg - base.plateCostPerBox - ((base.punchingDieTotal || 0) / anchorQty);
    const mfgPerBox = baseWithoutAmort + plateAmortised + punchDieAmortised;
    const profit = (inputs.profitPercent / 100) * mfgPerBox;
    const ratePerBox = mfgPerBox + profit;
    return {
      qty,
      mfgPerBox: round4(mfgPerBox),
      plateAmortised: round4(plateAmortised),
      punchDieAmortised: round4(punchDieAmortised),
      ratePerBox: round4(ratePerBox),
      orderTotal: Math.round(ratePerBox * qty * 100) / 100,
    };
  });
}

export function optimizationTips(f, result) {
  const tips = [];
  if (f.gsm > 350) tips.push("GSM above 350 may be over-spec — review carton/food safety requirements.");
  if (f.printing && f.coverage === 100) tips.push("100% coverage significantly increases print cost.");
  if (f.printing && f.colours > 3)
    tips.push(`${f.colours} colours = ₹${(f.colours * PLATE_COST_PER_COLOUR).toLocaleString("en-IN")} in plate costs.`);
  if (!f.outerCartonRate) tips.push("Outer carton cost not entered — per-box logistics will be missing.");
  if (!tips.length) tips.push("Inputs look reasonable. Main savings: paper GSM, coverage %, and outer carton economy.");
  return tips;
}
