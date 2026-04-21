// Turn a stored rate-card item into a tier price curve. Two modes:
//
//   • `cup_formula` — reconstitutes a paper-cup spec and runs the live
//     rate-curve engine against the current RM constants. Prices change
//     automatically when paper rates in lib/calc/cup-calculator.js are
//     updated — that's the point.
//
//   • `fixed` — passes stored per-tier rates through unchanged. Used for
//     PET cups, lids, or any SKU without a paper RM index.

import { computeCupRateCurve } from "@/lib/calc/cup-calculator";

export function priceItem(item) {
  const tierQtys = Array.isArray(item.tierQtys) && item.tierQtys.length
    ? item.tierQtys.map(Number).filter((n) => n > 0)
    : [];

  if (item.pricingMode === "cup_formula" && item.cupSpec) {
    const tiers = tierQtys.length ? tierQtys : [25000, 50000, 100000, 250000];
    try {
      const curve = computeCupRateCurve(item.cupSpec, tiers);
      return {
        mode: "cup_formula",
        tiers: curve.map((t) => ({ qty: t.qty, rate: t.ratePerCup })),
        error: null,
      };
    } catch (err) {
      return { mode: "cup_formula", tiers: [], error: String(err?.message || err) };
    }
  }

  // Fixed: each entry is { qty, rate }.
  const fixed = Array.isArray(item.fixedRates) ? item.fixedRates : [];
  return {
    mode: "fixed",
    tiers: fixed
      .filter((t) => t && Number(t.qty) > 0)
      .map((t) => ({ qty: Number(t.qty), rate: Number(t.rate) || 0 })),
    error: null,
  };
}

export function priceAll(items) {
  return items.map((it) => ({ ...it, pricing: priceItem(it) }));
}
