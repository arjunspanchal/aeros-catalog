// Aeros PP Item Rate Calculator — pure calculation engine.
// Models thermoforming-line PP items (cups, lids). Layered on top of the
// floor-level "Item Rate Calculation" workbook with the structural fixes
// thin-wall PP costing actually needs:
//   • Sheet yield + regrind credit (trim is ~30–50% of sheet weight in thin-wall)
//   • Electricity (heaters + vacuum + chiller)
//   • Mold amortisation over expected life
//   • Reject % uplift on per-formed-part costs
//
// Setting yield=100, regrind=0, machinePowerKw=0, moldCost=0, rejectPct=0
// recovers the simple workbook behaviour exactly — defaults below are tuned
// to a typical Indian thin-wall PP line.

// Per-product defaults. Yield/regrind/power vary by product — lids waste less
// sheet and run on smaller machines than cups.
export const PP_PRESETS = {
  custom: {
    label: "Custom",
    itemWeight: 0,
    cycleTime: 8,
    itemsPerShot: 4,
    shiftHrs: 10,
    shiftsPerDay: 2,
    labourCostPerDay: 12000,
    innerSleeveCost: 0,
    innerPackingLabour: 0,
    unitsPerSleeve: 25,
    cartonCost: 60,
    casePack: 1000,
    profitPercent: 12,
    yieldPercent: 65,
    regrindCapturePercent: 70,
    machinePowerKw: 50,
    electricityRate: 8,
    moldCost: 0,
    moldLifeShots: 1000000,
    rejectPercent: 3,
  },
  "115_lid": {
    label: "115 mm PP Lid",
    itemWeight: 7,
    cycleTime: 8,
    itemsPerShot: 8,
    shiftHrs: 10,
    shiftsPerDay: 2,
    labourCostPerDay: 12000,
    innerSleeveCost: 0.75,
    innerPackingLabour: 0.15,
    unitsPerSleeve: 25,
    cartonCost: 60,
    casePack: 1000,
    profitPercent: 10,
    yieldPercent: 72,
    regrindCapturePercent: 70,
    machinePowerKw: 35,
    electricityRate: 8,
    moldCost: 0,
    moldLifeShots: 1000000,
    rejectPercent: 3,
  },
  "85_lid": {
    label: "85 mm PP Lid",
    itemWeight: 6,
    cycleTime: 8,
    itemsPerShot: 8,
    shiftHrs: 10,
    shiftsPerDay: 2,
    labourCostPerDay: 12000,
    innerSleeveCost: 0.75,
    innerPackingLabour: 0.15,
    unitsPerSleeve: 25,
    cartonCost: 60,
    casePack: 1000,
    profitPercent: 10,
    yieldPercent: 72,
    regrindCapturePercent: 70,
    machinePowerKw: 35,
    electricityRate: 8,
    moldCost: 0,
    moldLifeShots: 1000000,
    rejectPercent: 3,
  },
  "350_cup": {
    label: "350 mL PP Cup",
    itemWeight: 10.87,
    cycleTime: 5.8,
    itemsPerShot: 4,
    shiftHrs: 10,
    shiftsPerDay: 2,
    labourCostPerDay: 12000,
    innerSleeveCost: 2,
    innerPackingLabour: 0.15,
    unitsPerSleeve: 25,
    cartonCost: 60,
    casePack: 1000,
    profitPercent: 12,
    yieldPercent: 62,
    regrindCapturePercent: 70,
    machinePowerKw: 55,
    electricityRate: 8,
    moldCost: 0,
    moldLifeShots: 1000000,
    rejectPercent: 3,
  },
  "600_cup": {
    label: "600 mL PP Cup",
    itemWeight: 17.54,
    cycleTime: 8,
    itemsPerShot: 4,
    shiftHrs: 10,
    shiftsPerDay: 2,
    labourCostPerDay: 12000,
    innerSleeveCost: 2,
    innerPackingLabour: 0.15,
    unitsPerSleeve: 25,
    cartonCost: 60,
    casePack: 1000,
    profitPercent: 12,
    yieldPercent: 60,
    regrindCapturePercent: 70,
    machinePowerKw: 60,
    electricityRate: 8,
    moldCost: 0,
    moldLifeShots: 1000000,
    rejectPercent: 3,
  },
};

// Common PP RM grades — admin can override the rate per quote.
export const PP_RM_GRADES = [
  { key: "116", label: "PP @ ₹116/kg", rate: 116 },
  { key: "160", label: "PP @ ₹160/kg", rate: 160 },
  { key: "180", label: "PP @ ₹180/kg", rate: 180 },
];

// Zero out the advanced fields — gives the simple Excel-workbook model.
export const SIMPLE_MODEL_OVERRIDES = {
  yieldPercent: 100,
  regrindCapturePercent: 0,
  machinePowerKw: 0,
  electricityRate: 0,
  moldCost: 0,
  moldLifeShots: 1000000,
  rejectPercent: 0,
};

const round4 = (v) => Math.round(v * 10000) / 10000;

export function calculate(form) {
  const itemWeight = Number(form.itemWeight) || 0;
  const rmRate = Number(form.rmRate) || 0;
  const cycleTime = Number(form.cycleTime) || 0;
  const itemsPerShot = Number(form.itemsPerShot) || 0;
  const shiftHrs = Number(form.shiftHrs) || 0;
  const shiftsPerDay = Number(form.shiftsPerDay) || 0;
  const labourCostPerDay = Number(form.labourCostPerDay) || 0;
  const innerSleeveCost = Number(form.innerSleeveCost) || 0;
  const innerPackingLabour = Number(form.innerPackingLabour) || 0;
  const unitsPerSleeve = Number(form.unitsPerSleeve) || 0;
  const cartonCost = Number(form.cartonCost) || 0;
  const casePack = Number(form.casePack) || 0;
  const profitPercent = Number(form.profitPercent) || 0;
  // Advanced — defaults make these no-ops if missing, recovering the simple model.
  const yieldPercent = Number(form.yieldPercent) || 100;
  const regrindCapturePercent = Number(form.regrindCapturePercent) || 0;
  const machinePowerKw = Number(form.machinePowerKw) || 0;
  const electricityRate = Number(form.electricityRate) || 0;
  const moldCost = Number(form.moldCost) || 0;
  const moldLifeShots = Number(form.moldLifeShots) || 0;
  const rejectPercent = Number(form.rejectPercent) || 0;

  // RM: account for sheet draw, then credit reusable trim back at virgin rate.
  const sheetWeight = yieldPercent > 0 ? itemWeight / (yieldPercent / 100) : itemWeight;
  const trimWeight = Math.max(0, sheetWeight - itemWeight);
  const regrindWeight = trimWeight * (regrindCapturePercent / 100);
  const netRmWeight = sheetWeight - regrindWeight;
  const sheetRmCost = (sheetWeight * rmRate) / 1000;
  const regrindCredit = (regrindWeight * rmRate) / 1000;
  const rmCost = (netRmWeight * rmRate) / 1000;

  // Forming throughput
  const itemsPerMin = cycleTime > 0 ? (60 / cycleTime) * itemsPerShot : 0;
  const itemsPerHr = itemsPerMin * 60;
  const unitsPerShift = itemsPerHr * shiftHrs;
  const unitsPerDay = unitsPerShift * shiftsPerDay;
  const labourCostPerItem = unitsPerDay > 0 ? labourCostPerDay / unitsPerDay : 0;

  // Electricity = (kW × ₹/kWh) / items-per-hour
  const electricityCostPerItem = itemsPerHr > 0
    ? (machinePowerKw * electricityRate) / itemsPerHr
    : 0;

  // Mold amortised over expected shots × items-per-shot
  const moldLifeItems = moldLifeShots * itemsPerShot;
  const moldCostPerItem = moldLifeItems > 0 ? moldCost / moldLifeItems : 0;

  // Per-formed-part cost (everything that gets incurred whether the part is
  // good or rejected). Reject % uplifts only this — packing happens to good
  // parts only, so it's added after the uplift.
  const formedCostBase = rmCost + labourCostPerItem + electricityCostPerItem + moldCostPerItem;
  const rejectFactor = rejectPercent < 100 ? 100 / (100 - rejectPercent) : 1;
  const rejectUplift = formedCostBase * (rejectFactor - 1);
  const formedCost = formedCostBase + rejectUplift;

  // Packing
  const innerPackCostPerItem = unitsPerSleeve > 0
    ? (innerSleeveCost + innerPackingLabour) / unitsPerSleeve
    : 0;
  const cartonCostPerItem = casePack > 0 ? cartonCost / casePack : 0;
  const totalPackingCost = innerPackCostPerItem + cartonCostPerItem;

  // Totals
  const totalMfg = formedCost + totalPackingCost;
  const profit = (totalMfg * profitPercent) / 100;
  const sellingPrice = totalMfg + profit;

  return {
    // Geometry / RM
    sheetWeight: round4(sheetWeight),
    trimWeight: round4(trimWeight),
    regrindWeight: round4(regrindWeight),
    netRmWeight: round4(netRmWeight),
    sheetRmCost: round4(sheetRmCost),
    regrindCredit: round4(regrindCredit),
    rmCost: round4(rmCost),
    // Throughput
    itemsPerMin: round4(itemsPerMin),
    itemsPerHr: round4(itemsPerHr),
    unitsPerShift: Math.round(unitsPerShift),
    unitsPerDay: Math.round(unitsPerDay),
    // Per-part forming costs
    labourCostPerItem: round4(labourCostPerItem),
    electricityCostPerItem: round4(electricityCostPerItem),
    moldCostPerItem: round4(moldCostPerItem),
    rejectFactor: Math.round(rejectFactor * 10000) / 10000,
    rejectUplift: round4(rejectUplift),
    formedCost: round4(formedCost),
    // Packing
    innerPackCostPerItem: round4(innerPackCostPerItem),
    cartonCostPerItem: round4(cartonCostPerItem),
    totalPackingCost: round4(totalPackingCost),
    // Totals
    totalMfg: round4(totalMfg),
    profit: round4(profit),
    profitPct: profitPercent,
    sellingPrice: round4(sellingPrice),
    spPerCase: round4(sellingPrice * casePack),
  };
}
