// Aeros PP Item Rate Calculator — pure calculation engine.
// Models thermoforming-line PP items (cups, lids) where cost = RM + forming
// labour + packing, then margin. Mirrors the Excel "Item Rate Calculation"
// workbook (per-column structure repeated per item).

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
  },
};

// Common PP RM grades — admin can override the rate per quote.
export const PP_RM_GRADES = [
  { key: "116", label: "PP @ ₹116/kg", rate: 116 },
  { key: "160", label: "PP @ ₹160/kg", rate: 160 },
  { key: "180", label: "PP @ ₹180/kg", rate: 180 },
];

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

  // RM
  const rmCost = (itemWeight * rmRate) / 1000;

  // Forming throughput
  const itemsPerMin = cycleTime > 0 ? (60 / cycleTime) * itemsPerShot : 0;
  const itemsPerHr = itemsPerMin * 60;
  const unitsPerShift = itemsPerHr * shiftHrs;
  const unitsPerDay = unitsPerShift * shiftsPerDay;
  const labourCostPerItem = unitsPerDay > 0 ? labourCostPerDay / unitsPerDay : 0;

  // Packing
  const innerPackCostPerItem = unitsPerSleeve > 0
    ? (innerSleeveCost + innerPackingLabour) / unitsPerSleeve
    : 0;
  const cartonCostPerItem = casePack > 0 ? cartonCost / casePack : 0;
  const totalPackingCost = innerPackCostPerItem + cartonCostPerItem;

  // Totals
  const totalMfg = rmCost + labourCostPerItem + totalPackingCost;
  const profit = (totalMfg * profitPercent) / 100;
  const sellingPrice = totalMfg + profit;

  return {
    rmCost: round4(rmCost),
    itemsPerMin: round4(itemsPerMin),
    itemsPerHr: round4(itemsPerHr),
    unitsPerShift: Math.round(unitsPerShift),
    unitsPerDay: Math.round(unitsPerDay),
    labourCostPerItem: round4(labourCostPerItem),
    innerPackCostPerItem: round4(innerPackCostPerItem),
    cartonCostPerItem: round4(cartonCostPerItem),
    totalPackingCost: round4(totalPackingCost),
    totalMfg: round4(totalMfg),
    profit: round4(profit),
    profitPct: profitPercent,
    sellingPrice: round4(sellingPrice),
    spPerCase: round4(sellingPrice * casePack),
  };
}
