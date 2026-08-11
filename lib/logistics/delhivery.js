// Delhivery domestic B2B freight engine — pure functions, safe client-side.
//
// Commercial terms from the Delhivery Addendum dated 31/01/2026 (effective
// 01/01/2026, Boson Machines OPC Pvt Ltd), Annexure II:
//   freight  = chargeable kg x lane rate      (min ₹150/LR, min 10 kg/LR)
//   chargeable = max(dead weight, volumetric) ; volumetric = cm3 / 3375
//   + docket ₹125/LR
//   + FOV/ROV 0.1% of declared value (min ₹100)
//   + handling ₹3/kg when chargeable >= 400 kg
//   + ODA ₹1,500 flat when destination pincode is ODA
//   + FSC 10% of base freight
//   GST 18% (IGST) shown separately — recoverable ITC, never loaded into
//   customer prices (house rule), but part of cash out the door.
//
// Rate resolution: destination state with a lane-based rate (NE states, Assam,
// Guwahati city, Sikkim, HP, J&K, Ladakh) overrides the 9x9 zone matrix.
// Zone membership by state is ASSUMED (standard Delhivery zoning) except
// Maharashtra = W2 which the contract states; see delhivery_zone_map.status.

// ---- pincode -> state ------------------------------------------------------
// Indian postal prefixes. 3-digit overrides first, then 2-digit defaults.
// Where a boundary is fuzzy (UP/UK, Bihar/Jharkhand) both sides fall in the
// same Delhivery zone, so the rate is unaffected.
const PIN3 = {
  160: "Chandigarh",
  194: "Ladakh",
  246: "Uttarakhand", 248: "Uttarakhand", 249: "Uttarakhand", 263: "Uttarakhand", 264: "Uttarakhand",
  396: "Daman & Diu",
  403: "Goa",
  605: "Puducherry",
  737: "Sikkim",
  744: "Andaman & Nicobar",
  781: "Guwahati", // city override — cheaper lane than rest of Assam
  790: "Arunachal Pradesh", 791: "Arunachal Pradesh", 792: "Arunachal Pradesh",
  793: "Meghalaya", 794: "Meghalaya",
  795: "Manipur",
  796: "Mizoram",
  797: "Nagaland", 798: "Nagaland",
  799: "Tripura",
};
const PIN2 = {
  11: "Delhi", 12: "Haryana", 13: "Haryana", 14: "Punjab", 15: "Punjab", 16: "Punjab",
  17: "Himachal Pradesh", 18: "Jammu & Kashmir", 19: "Jammu & Kashmir",
  20: "Uttar Pradesh", 21: "Uttar Pradesh", 22: "Uttar Pradesh", 23: "Uttar Pradesh",
  24: "Uttar Pradesh", 25: "Uttar Pradesh", 26: "Uttar Pradesh", 27: "Uttar Pradesh", 28: "Uttar Pradesh",
  30: "Rajasthan", 31: "Rajasthan", 32: "Rajasthan", 33: "Rajasthan", 34: "Rajasthan",
  36: "Gujarat", 37: "Gujarat", 38: "Gujarat", 39: "Gujarat",
  40: "Maharashtra", 41: "Maharashtra", 42: "Maharashtra", 43: "Maharashtra", 44: "Maharashtra",
  45: "Madhya Pradesh", 46: "Madhya Pradesh", 47: "Madhya Pradesh", 48: "Madhya Pradesh",
  49: "Chhattisgarh",
  50: "Telangana", 51: "Andhra Pradesh", 52: "Andhra Pradesh", 53: "Andhra Pradesh",
  56: "Karnataka", 57: "Karnataka", 58: "Karnataka", 59: "Karnataka",
  60: "Tamil Nadu", 61: "Tamil Nadu", 62: "Tamil Nadu", 63: "Tamil Nadu", 64: "Tamil Nadu",
  65: "Tamil Nadu", 66: "Tamil Nadu",
  67: "Kerala", 68: "Kerala", 69: "Kerala",
  70: "West Bengal", 71: "West Bengal", 72: "West Bengal", 73: "West Bengal", 74: "West Bengal",
  75: "Odisha", 76: "Odisha", 77: "Odisha",
  78: "Assam", 79: "Arunachal Pradesh",
  80: "Bihar", 81: "Bihar", 82: "Bihar", 83: "Jharkhand", 84: "Bihar", 85: "Bihar",
};

export function pinToState(pincode) {
  const pin = String(pincode || "").trim();
  if (!/^\d{6}$/.test(pin)) return null;
  return PIN3[+pin.slice(0, 3)] || PIN2[+pin.slice(0, 2)] || null;
}

// "Guwahati" is a lane name, not a state — its state is Assam.
export function laneAndState(pincode) {
  const name = pinToState(pincode);
  if (!name) return { state: null, laneName: null };
  if (name === "Guwahati") return { state: "Assam", laneName: "Guwahati" };
  return { state: name, laneName: name };
}

export function stateToZone(state, zoneMap) {
  const row = (zoneMap || []).find((r) => r.state === state);
  return row ? { zone: row.zone, status: row.status } : null;
}

// ---- per-line weights ------------------------------------------------------
export function parseCartonCm(dimsText) {
  if (!dimsText) return null;
  const m = String(dimsText).match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i);
  if (!m) return null;
  // Catalogue stores mm; treat values <= 20 as already-cm safety net.
  const [l, w, h] = [+m[1], +m[2], +m[3]];
  const mm = l > 20 || w > 20 || h > 20;
  return mm ? [l / 10, w / 10, h / 10] : [l, w, h];
}

export function lineWeights({ qty, unitsPerCase, grossWeightKg, volumetricWeightKg, cartonDimensions }) {
  const units = Math.max(1, +unitsPerCase || 1);
  const cases = Math.ceil((+qty || 0) / units);
  const actualKg = cases * (+grossWeightKg || 0);
  let volPerCase = +volumetricWeightKg || 0;
  if (!volPerCase) {
    const cm = parseCartonCm(cartonDimensions);
    if (cm) volPerCase = (cm[0] * cm[1] * cm[2]) / 3375;
  }
  return { cases, actualKg, volKg: cases * volPerCase };
}

// ---- rate resolution -------------------------------------------------------
export function resolveRate({ originPincode, destPincode, zoneMap, zoneMatrix, laneRates }) {
  const origin = laneAndState(originPincode);
  const dest = laneAndState(destPincode);
  if (!origin.state) return { error: `Origin pincode ${originPincode} not recognised.` };
  if (!dest.state) return { error: `Destination pincode ${destPincode} not recognised.` };

  const originZone = stateToZone(origin.state, zoneMap);
  if (!originZone) return { error: `No zone mapping for origin state ${origin.state}.` };

  // Lane-based destination override (state name or Guwahati city).
  const lane = (laneRates || []).find(
    (r) => r.origin_zone === originZone.zone && r.dest_name === dest.laneName,
  );
  if (lane) {
    return {
      ratePerKg: +lane.rate_per_kg,
      basis: `lane ${originZone.zone} → ${dest.laneName}`,
      originState: origin.state,
      destState: dest.state,
      originZone: originZone.zone,
      destZone: null,
      assumed: originZone.status !== "confirmed",
    };
  }

  const destZone = stateToZone(dest.state, zoneMap);
  if (!destZone) return { error: `No zone mapping for destination state ${dest.state}.` };
  const cell = (zoneMatrix || []).find(
    (r) => r.origin_zone === originZone.zone && r.dest_zone === destZone.zone,
  );
  if (!cell) return { error: `No rate for ${originZone.zone} → ${destZone.zone}.` };
  return {
    ratePerKg: +cell.rate_per_kg,
    basis: `zone ${originZone.zone} → ${destZone.zone}`,
    originState: origin.state,
    destState: dest.state,
    originZone: originZone.zone,
    destZone: destZone.zone,
    assumed: originZone.status !== "confirmed" || destZone.status !== "confirmed",
  };
}

// ---- the quote -------------------------------------------------------------
export function computeQuote({ lines, originPincode, destPincode, isOda = false, declaredValue = 0, config, zoneMap, zoneMatrix, laneRates }) {
  const cfg = {
    docketFee: +(config?.docket_fee_inr ?? 125),
    fscPct: +(config?.fuel_surcharge_pct ?? 10),
    fovPct: +(config?.fov_pct ?? 0.1),
    fovMin: +(config?.fov_min_inr ?? 100),
    minLr: +(config?.min_lr_charge_inr ?? 150),
    minKg: +(config?.min_chargeable_weight_kg ?? 10),
    gstPct: +(config?.default_gst_pct ?? 18),
    handlingThresholdKg: +(config?.handling_threshold_kg ?? 400),
    handlingRatePerKg: +(config?.handling_rate_per_kg ?? 3),
    odaFlat: +(config?.oda_flat_inr ?? 1500),
  };

  const weighed = (lines || []).map((l) => ({ ...l, ...lineWeights(l) }));
  const actualKg = weighed.reduce((s, l) => s + l.actualKg, 0);
  const volKg = weighed.reduce((s, l) => s + l.volKg, 0);
  const cases = weighed.reduce((s, l) => s + l.cases, 0);
  const weightBasis = volKg > actualKg ? "volumetric" : "actual";
  const chargeableKg = Math.max(Math.ceil(Math.max(actualKg, volKg)), cfg.minKg);

  const rate = resolveRate({ originPincode, destPincode, zoneMap, zoneMatrix, laneRates });
  if (rate.error) return { error: rate.error, weighed, actualKg, volKg, cases };

  const baseFreight = Math.max(chargeableKg * rate.ratePerKg, cfg.minLr);
  const fsc = (baseFreight * cfg.fscPct) / 100;
  const docket = cfg.docketFee;
  const fov = Math.max(((+declaredValue || 0) * cfg.fovPct) / 100, cfg.fovMin);
  const handling = chargeableKg >= cfg.handlingThresholdKg ? chargeableKg * cfg.handlingRatePerKg : 0;
  const oda = isOda ? cfg.odaFlat : 0;

  const totalExGst = baseFreight + fsc + docket + fov + handling + oda;
  const gst = (totalExGst * cfg.gstPct) / 100;
  const totalUnits = weighed.reduce((s, l) => s + (+l.qty || 0), 0);

  return {
    totalUnits,
    // Freight absorbed into product cost is EX-GST (18% is recoverable ITC —
    // house rule: never load freight GST into a customer price).
    perCaseExGst: cases ? round2(totalExGst / cases) : 0,
    perUnitExGst: totalUnits ? Math.round((totalExGst / totalUnits) * 10000) / 10000 : 0,
    lines: weighed,
    cases,
    actualKg: round2(actualKg),
    volKg: round2(volKg),
    weightBasis,
    chargeableKg,
    rate,
    charges: {
      baseFreight: round2(baseFreight),
      fsc: round2(fsc),
      docket: round2(docket),
      fov: round2(fov),
      handling: round2(handling),
      oda: round2(oda),
    },
    totalExGst: round2(totalExGst),
    gst: round2(gst),
    total: round2(totalExGst + gst),
    perKg: round2((totalExGst + gst) / chargeableKg),
    config: cfg,
  };
}

function round2(v) {
  return Math.round(v * 100) / 100;
}
