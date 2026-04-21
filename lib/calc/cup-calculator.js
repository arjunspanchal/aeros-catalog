// Aeros Paper Cup Rate Calculator — pure calculation engine.
// Ported from the internal cup pricing sheet. No framework deps.

export const COATING_RATES = { PE: 13, "2PE": 26, PLA: 35, Aqueous: 20 };

export const DEFAULTS = {
  bottomRollWidth: 75,      // mm — fixed bottom disc roll width
  sidewallFans: 6,
  outerFansDW_small: 9,     // 8/12 oz outer fan
  outerFansDW_large: 6,     // 16/20 oz outer fan
  offsetRate: 0.25,         // ₹ per cup per offset colour
  flexoPlate: 9000,         // ₹ per flexo colour (one-time)
  offsetDie: 700,           // ₹ per offset colour (one-time)
};

export const WEIGHT_CORRECTION = 0.908;
export const MONTHLY_CAPACITY = 1_080_000;     // 60 cups/min × 720 min × 25 days
export const PACK_LABOUR_MONTHLY = 30_000;
export const PACK_LABOUR_PER_CUP = PACK_LABOUR_MONTHLY / MONTHLY_CAPACITY;

// Sidewall fan dimensions [length_mm, width_mm] by size and print method
export const SW_DIMS = {
  "8oz":  { Flexo: [665, 260], Offset: [675, 305] },
  "12oz": { Flexo: [740, 310], Offset: [745, 370] },
  "16oz": { Flexo: [740, 365], Offset: [750, 300] },
  "20oz": { Flexo: [750, 406], Offset: [750, 400] },
};

// Outer fan dimensions for DW / Ripple
export const OF_DIMS = {
  "8oz":  [675, 305],
  "12oz": [745, 370],
  "16oz": [750, 300],
  "20oz": [750, 400],
};

export const CASE_PACK_DEFAULTS = {
  "Single Wall": { "8oz": 1000, "12oz": 1000, "16oz": 1000, "20oz": 1000 },
  "Double Wall": { "8oz": 500,  "12oz": 500,  "16oz": 500,  "20oz": 500 },
  "Ripple":      { "8oz": 500,  "12oz": 500,  "16oz": 500,  "20oz": 500 },
};

export const CUP_PRESETS = {
  "DW Export": {
    label: "DW Export", wallType: "Double Wall", sizes: ["8oz", "12oz", "16oz", "20oz"],
    sw: { "8oz": { gsm: 280, coating: "PE" }, "12oz": { gsm: 280, coating: "PE" }, "16oz": { gsm: 280, coating: "PE" }, "20oz": { gsm: 280, coating: "PE" } },
    bt: { "8oz": { gsm: 220, coating: "2PE" }, "12oz": { gsm: 220, coating: "2PE" }, "16oz": { gsm: 220, coating: "2PE" }, "20oz": { gsm: 220, coating: "2PE" } },
    of: { "8oz": { gsm: 280, coating: "PE" }, "12oz": { gsm: 280, coating: "PE" }, "16oz": { gsm: 280, coating: "PE" }, "20oz": { gsm: 300, coating: "PE" } },
    codes: {
      "8oz":  { code: "C100001", td: 80, bd: 56, h: 93 },
      "12oz": { code: "C100002", td: 90, bd: 60, h: 111 },
      "16oz": { code: "C100003", td: 90, bd: 60, h: 135 },
      "20oz": { code: "", td: null, bd: null, h: null },
    },
  },
  "DW Standard": {
    label: "DW Standard", wallType: "Double Wall", sizes: ["8oz", "12oz", "16oz", "20oz"],
    sw: { "8oz": { gsm: 280, coating: "PE" }, "12oz": { gsm: 280, coating: "PE" }, "16oz": { gsm: 280, coating: "PE" }, "20oz": { gsm: 280, coating: "PE" } },
    bt: { "8oz": { gsm: 220, coating: "2PE" }, "12oz": { gsm: 220, coating: "2PE" }, "16oz": { gsm: 220, coating: "2PE" }, "20oz": { gsm: 220, coating: "2PE" } },
    of: { "8oz": { gsm: 260, coating: "PE" }, "12oz": { gsm: 260, coating: "PE" }, "16oz": { gsm: 280, coating: "PE" }, "20oz": { gsm: 280, coating: "PE" } },
    codes: {
      "8oz":  { code: "", td: null, bd: null, h: null },
      "12oz": { code: "", td: null, bd: null, h: null },
      "16oz": { code: "", td: null, bd: null, h: null },
      "20oz": { code: "", td: null, bd: null, h: null },
    },
  },
  "SW Standard": {
    label: "SW Standard", wallType: "Single Wall", sizes: ["8oz", "12oz", "16oz", "20oz"],
    sw: { "8oz": { gsm: 280, coating: "PE" }, "12oz": { gsm: 280, coating: "PE" }, "16oz": { gsm: 280, coating: "PE" }, "20oz": { gsm: 280, coating: "PE" } },
    bt: { "8oz": { gsm: 220, coating: "2PE" }, "12oz": { gsm: 220, coating: "2PE" }, "16oz": { gsm: 220, coating: "2PE" }, "20oz": { gsm: 220, coating: "2PE" } },
    of: null,
    codes: {
      "8oz":  { code: "", td: null, bd: null, h: null },
      "12oz": { code: "", td: null, bd: null, h: null },
      "16oz": { code: "", td: null, bd: null, h: null },
      "20oz": { code: "", td: null, bd: null, h: null },
    },
  },
  "Ripple Standard": {
    label: "Ripple Standard", wallType: "Ripple", sizes: ["8oz", "12oz", "16oz", "20oz"],
    sw: { "8oz": { gsm: 280, coating: "PE" }, "12oz": { gsm: 280, coating: "PE" }, "16oz": { gsm: 280, coating: "PE" }, "20oz": { gsm: 280, coating: "PE" } },
    bt: { "8oz": { gsm: 220, coating: "2PE" }, "12oz": { gsm: 220, coating: "2PE" }, "16oz": { gsm: 220, coating: "2PE" }, "20oz": { gsm: 220, coating: "2PE" } },
    of: { "8oz": { gsm: 280, coating: "PE" }, "12oz": { gsm: 280, coating: "PE" }, "16oz": { gsm: 280, coating: "PE" }, "20oz": { gsm: 300, coating: "PE" } },
    codes: {
      "8oz":  { code: "", td: null, bd: null, h: null },
      "12oz": { code: "", td: null, bd: null, h: null },
      "16oz": { code: "", td: null, bd: null, h: null },
      "20oz": { code: "", td: null, bd: null, h: null },
    },
  },
};

export const PACKING_PRESETS = {
  "SW Standard":     { "8oz": { poly: 1.23, carton: 70 }, "12oz": { poly: "", carton: "" }, "16oz": { poly: "", carton: "" }, "20oz": { poly: "", carton: "" } },
  "DW Standard":     { "8oz": { poly: "", carton: "" }, "12oz": { poly: "", carton: "" }, "16oz": { poly: "", carton: "" }, "20oz": { poly: "", carton: "" } },
  "DW Export":       { "8oz": { poly: "", carton: "" }, "12oz": { poly: "", carton: "" }, "16oz": { poly: "", carton: "" }, "20oz": { poly: "", carton: "" } },
  "Ripple Standard": { "8oz": { poly: "", carton: "" }, "12oz": { poly: "", carton: "" }, "16oz": { poly: "", carton: "" }, "20oz": { poly: "", carton: "" } },
};

export const SIZE_OPTS = ["8oz", "12oz", "16oz", "20oz"];
export const PRINT_OPTS = ["No printing", "Flexo", "Offset"];
export const COATING_OPTS = ["None", "PE", "2PE", "PLA", "Aqueous"];

// Customer-facing defaults — the customer form does not surface paper rates,
// conversion, packing, glue or margin. Admin view stays fully manual.
export const CUSTOMER_DEFAULTS = {
  innerPaperRate: 95,   // ₹/kg sidewall stock
  outerPaperRate: 85,   // ₹/kg outer-fan stock
  bottomPaperRate: 90,  // ₹/kg bottom roll
  conv: 0.368,          // ₹/cup
  pack: 0.15,           // ₹/cup
  glue: 0.05,           // ₹/cup
  other: 0,
  margin: 15,           // %
};

// Flexo colour ₹/kg by coverage tier — mirrors paper-bag PRINTING_RATES.
export const COVERAGE_FLEXO_RATES = { 10: 7, 30: 10, 100: 15 };

// Qty tiers for the customer rate curve. Plate + die cost amortise across
// qty, so higher qty = lower per-cup rate when printing is on.
export const CUP_QTY_TIERS = [25000, 50000, 100000, 250000, 500000];

export function getOuterFanCount(size) {
  return size === "8oz" || size === "12oz" ? DEFAULTS.outerFansDW_small : DEFAULTS.outerFansDW_large;
}

export function getSidewallDims(size, printMethod) {
  if (!size || !SW_DIMS[size]) return null;
  if (printMethod && printMethod !== "No printing" && SW_DIMS[size][printMethod]) return SW_DIMS[size][printMethod];
  return SW_DIMS[size]["Flexo"];
}

function effectiveCoatingRate(coating, manual) {
  if (!coating || coating === "None") return 0;
  return COATING_RATES[coating] ?? (parseFloat(manual) || 0);
}

// Core calc. Input is a plain object with string/number fields. Output is the
// breakdown used by the UI.
export function calculate(f) {
  const isDW = f.wallType === "Double Wall" || f.wallType === "Ripple";
  const swDims = getSidewallDims(f.size, f.swPrint) || [0, 0];
  const swF = DEFAULTS.sidewallFans;

  // Sidewall RM
  const swTotalRate = (parseFloat(f.swRate) || 0) + effectiveCoatingRate(f.swCoating, f.swCoatingRate);
  const swWeight = (swDims[0] / 1000) * (swDims[1] / 1000) * ((parseFloat(f.swGSM) || 0) / 1000);
  const swRM = (swWeight * swTotalRate) / swF;

  // Sidewall printing
  let swPrintCost = 0;
  if (f.swPrint === "Flexo") {
    const c = parseInt(f.swColors) || 1;
    const r1 = parseFloat(f.swRate1) || 0;
    const rn = parseFloat(f.swRateN) || 0;
    swPrintCost = (swWeight * (r1 + (c - 1) * rn)) / swF;
  } else if (f.swPrint === "Offset") {
    const c = parseInt(f.swColors) || 0;
    swPrintCost = (c * DEFAULTS.offsetRate) / swF;
  }

  // Bottom disc — circle of dia = bottomRollWidth
  const btR = DEFAULTS.bottomRollWidth / 2 / 1000;
  const btTotalRate = (parseFloat(f.btRate) || 0) + effectiveCoatingRate(f.btCoating, f.btCoatingRate);
  const btCost = Math.PI * btR * btR * ((parseFloat(f.btGSM) || 0) / 1000) * btTotalRate;

  // Outer fan (DW / Ripple only)
  let ofRM = 0, ofPrintCost = 0, ofWeight = 0, ofWeightG_val = 0;
  if (isDW) {
    const ofDims = OF_DIMS[f.size];
    if (ofDims) {
      const ofFans = getOuterFanCount(f.size);
      const ofTotalRate = (parseFloat(f.ofRate) || 0) + effectiveCoatingRate(f.ofCoating, f.ofCoatingRate);
      ofWeight = (ofDims[0] / 1000) * (ofDims[1] / 1000) * ((parseFloat(f.ofGSM) || 0) / 1000);
      ofWeightG_val = ofWeight * 1000 * WEIGHT_CORRECTION;
      ofRM = (ofWeight * ofTotalRate) / ofFans;
      if (f.ofPrint === "Flexo") {
        const c = parseInt(f.ofColors) || 1;
        const r1 = parseFloat(f.ofRate1) || 0;
        const rn = parseFloat(f.ofRateN) || 0;
        ofPrintCost = (ofWeight * (r1 + (c - 1) * rn)) / ofFans;
      } else if (f.ofPrint === "Offset") {
        const c = parseInt(f.ofColors) || 0;
        ofPrintCost = (c * DEFAULTS.offsetRate) / ofFans;
      }
    }
  }
  const ofTotal = ofRM + ofPrintCost;

  // Weights (for display / per-cup)
  const swWeightG = swWeight * 1000 * WEIGHT_CORRECTION;
  const btWeightG = Math.PI * btR * btR * ((parseFloat(f.btGSM) || 0) / 1000) * 1000 * WEIGHT_CORRECTION;
  const cupWeightG = swWeightG + btWeightG + ofWeightG_val;

  const conv = parseFloat(f.conv) || 0;
  const pack = parseFloat(f.pack) || 0;
  const glue = parseFloat(f.glue) || 0;
  const other = parseFloat(f.otherCost) || 0;
  const mfg = swRM + swPrintCost + ofTotal + btCost + conv + pack + glue + other;

  const mp = parseFloat(f.margin) || 0;
  const marginAmt = mp >= 100 ? 0 : (mfg * mp) / (100 - mp);
  const sp = mfg + marginAmt;
  const spCase = sp * (parseInt(f.casePack) || 1);

  const swPlate = f.swPrint === "Flexo" ? (parseInt(f.swColors) || 0) * DEFAULTS.flexoPlate : null;
  const swDie   = f.swPrint === "Offset" ? (parseInt(f.swColors) || 0) * DEFAULTS.offsetDie : null;
  const ofPlate = f.ofPrint === "Flexo" ? (parseInt(f.ofColors) || 0) * DEFAULTS.flexoPlate : null;
  const ofDie   = f.ofPrint === "Offset" ? (parseInt(f.ofColors) || 0) * DEFAULTS.offsetDie : null;

  return {
    swRM, swPrintCost, ofTotal, btCost,
    conv, pack, glue, other,
    mfg, marginAmt, sp, spCase, mp,
    swPlate, swDie, ofPlate, ofDie,
    swWeightG, btWeightG, ofWeightG: ofWeightG_val, cupWeightG,
    swDims, isDW,
  };
}

// Customer-form inputs → full engine inputs, with defaults filled in. Returns
// the object you can pass to `calculate(...)` or `computeCupRateCurve(...)`.
// Customer form fields: wallType, size, casePack, dims (td/bd/h),
// inner { gsm, coating, print: "Flexo"|"No printing", colours, coverage },
// outer { gsm, coating, print, colours, coverage }, orderQty.
export function customerFormToEngineInputs(cf) {
  const innerCoverage = cf.inner?.coverage ? parseInt(cf.inner.coverage) : null;
  const outerCoverage = cf.outer?.coverage ? parseInt(cf.outer.coverage) : null;
  const innerRate = innerCoverage ? (COVERAGE_FLEXO_RATES[innerCoverage] ?? 0) : 0;
  const outerRate = outerCoverage ? (COVERAGE_FLEXO_RATES[outerCoverage] ?? 0) : 0;
  const autoCasePack = CASE_PACK_DEFAULTS[cf.wallType]?.[cf.size] || 500;

  return {
    wallType: cf.wallType,
    size: cf.size,
    casePack: String(cf.casePack || autoCasePack),
    margin: String(CUSTOMER_DEFAULTS.margin),

    swGSM: String(cf.inner?.gsm || ""),
    swRate: String(CUSTOMER_DEFAULTS.innerPaperRate),
    swCoating: cf.inner?.coating || "None",
    swCoatingRate: "",
    swPrint: cf.inner?.print ? "Flexo" : "No printing",
    swColors: cf.inner?.print ? String(cf.inner.colours || 1) : "",
    swRate1: cf.inner?.print ? String(innerRate) : "",
    swRateN: cf.inner?.print ? String(innerRate) : "",

    btGSM: "220",
    btRate: String(CUSTOMER_DEFAULTS.bottomPaperRate),
    btCoating: "2PE",
    btCoatingRate: "",

    ofGSM: String(cf.outer?.gsm || ""),
    ofRate: String(CUSTOMER_DEFAULTS.outerPaperRate),
    ofCoating: cf.outer?.coating || "None",
    ofCoatingRate: "",
    ofPrint: cf.outer?.print ? "Flexo" : "No printing",
    ofColors: cf.outer?.print ? String(cf.outer.colours || 1) : "",
    ofRate1: cf.outer?.print ? String(outerRate) : "",
    ofRateN: cf.outer?.print ? String(outerRate) : "",

    conv: String(CUSTOMER_DEFAULTS.conv),
    pack: String(CUSTOMER_DEFAULTS.pack),
    glue: String(CUSTOMER_DEFAULTS.glue),
    otherCost: String(CUSTOMER_DEFAULTS.other),
  };
}

// Rate curve across qty tiers. Plate + die are one-time, so they amortise:
// as qty grows, per-cup rate drops. No printing → curve is flat.
export function computeCupRateCurve(customerInputs, tiers = CUP_QTY_TIERS) {
  const engineInputs = customerFormToEngineInputs(customerInputs);
  const base = calculate(engineInputs);
  const oneTime = (base.swPlate || 0) + (base.swDie || 0) + (base.ofPlate || 0) + (base.ofDie || 0);
  const casePack = parseInt(engineInputs.casePack) || 1;
  const mp = CUSTOMER_DEFAULTS.margin;

  return tiers.map((qty) => {
    const oneTimePerCup = qty > 0 ? oneTime / qty : 0;
    const mfgPerCup = base.mfg + oneTimePerCup;
    const marginAmt = mp >= 100 ? 0 : (mfgPerCup * mp) / (100 - mp);
    const ratePerCup = mfgPerCup + marginAmt;
    return {
      qty,
      mfgPerCup: Math.round(mfgPerCup * 10000) / 10000,
      oneTimePerCup: Math.round(oneTimePerCup * 10000) / 10000,
      ratePerCup: Math.round(ratePerCup * 10000) / 10000,
      ratePerCase: Math.round(ratePerCup * casePack * 100) / 100,
      orderTotal: Math.round(ratePerCup * qty * 100) / 100,
    };
  });
}
