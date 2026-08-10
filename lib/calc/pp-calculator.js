// Aeros PP Item Rate Calculator — pure calculation engine.
// Models injection-moulding-line PP items (cups, lids). Layered on top of the
// floor-level "Item Rate Calculation" workbook with the structural fixes
// thin-wall PP IM costing actually needs:
//   • Runner/sprue waste per shot + regrind credit
//   • Electricity (heaters + screw drive + clamp + chiller)
//   • Mold amortisation over expected life
//   • Reject % uplift on per-formed-part costs
//   • Dry-offset printing on formed cups — ink/run rate per colour, plate
//     amortisation, and print spoilage (which scraps an already-formed cup)
//
// Setting runnerWeightPerShot=0, machinePowerKw=0, moldCost=0, rejectPct=0,
// printColours=0 recovers the simple workbook behaviour exactly — defaults
// below are tuned to a typical Indian thin-wall PP IM line with cold runners.

// Per-product defaults. Runner weight scales with cavity count — typical
// cold-runner systems lose ~3–8 g of PP per shot to sprue + gates.
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
    runnerWeightPerShot: 4,
    regrindCapturePercent: 95,
    machinePowerKw: 50,
    electricityRate: 8,
    moldCost: 0,
    moldLifeShots: 1000000,
    rejectPercent: 3,
    printColours: 0,
    printRatePerColour: 0.2,
    printPlateCostPerColour: 2000,
    printOrderQty: 100000,
    printRejectPercent: 2,
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
    runnerWeightPerShot: 4,
    regrindCapturePercent: 95,
    machinePowerKw: 35,
    electricityRate: 8,
    moldCost: 0,
    moldLifeShots: 1000000,
    rejectPercent: 3,
    printColours: 0,
    printRatePerColour: 0.2,
    printPlateCostPerColour: 2000,
    printOrderQty: 100000,
    printRejectPercent: 2,
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
    runnerWeightPerShot: 3,
    regrindCapturePercent: 95,
    machinePowerKw: 35,
    electricityRate: 8,
    moldCost: 0,
    moldLifeShots: 1000000,
    rejectPercent: 3,
    printColours: 0,
    printRatePerColour: 0.2,
    printPlateCostPerColour: 2000,
    printOrderQty: 100000,
    printRejectPercent: 2,
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
    runnerWeightPerShot: 6,
    regrindCapturePercent: 95,
    machinePowerKw: 55,
    electricityRate: 8,
    moldCost: 0,
    moldLifeShots: 1000000,
    rejectPercent: 3,
    printColours: 0,
    printRatePerColour: 0.2,
    printPlateCostPerColour: 2000,
    printOrderQty: 100000,
    printRejectPercent: 2,
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
    runnerWeightPerShot: 8,
    regrindCapturePercent: 95,
    machinePowerKw: 60,
    electricityRate: 8,
    moldCost: 0,
    moldLifeShots: 1000000,
    rejectPercent: 3,
    printColours: 0,
    printRatePerColour: 0.2,
    printPlateCostPerColour: 2000,
    printOrderQty: 100000,
    printRejectPercent: 2,
  },
};

// Common PP RM grades — admin can override the rate per quote.
export const PP_RM_GRADES = [
  { key: "116", label: "PP @ ₹116/kg", rate: 116 },
  { key: "166", label: "PP @ ₹166/kg", rate: 166 },
  { key: "180", label: "PP @ ₹180/kg", rate: 180 },
];

// PP cups print (dry offset on the formed cup). PP/PET lids never do — the
// same rule the DB enforces via a trigger on printed pricing rows. The UI
// locks the printing card for these presets.
export const NON_PRINTABLE_PRESETS = new Set(["115_lid", "85_lid"]);

// Zero out the advanced fields — gives the simple Excel-workbook model.
export const SIMPLE_MODEL_OVERRIDES = {
  runnerWeightPerShot: 0,
  regrindCapturePercent: 0,
  machinePowerKw: 0,
  electricityRate: 0,
  moldCost: 0,
  moldLifeShots: 1000000,
  rejectPercent: 0,
  printRejectPercent: 0,
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
  const runnerWeightPerShot = Number(form.runnerWeightPerShot) || 0;
  const regrindCapturePercent = Number(form.regrindCapturePercent) || 0;
  const machinePowerKw = Number(form.machinePowerKw) || 0;
  const electricityRate = Number(form.electricityRate) || 0;
  const moldCost = Number(form.moldCost) || 0;
  const moldLifeShots = Number(form.moldLifeShots) || 0;
  const rejectPercent = Number(form.rejectPercent) || 0;
  // Printing — printColours=0 means plain, and every printing term below
  // collapses to zero, leaving the unprinted rate untouched.
  const printColours = Number(form.printColours) || 0;
  const printRatePerColour = Number(form.printRatePerColour) || 0;
  const printPlateCostPerColour = Number(form.printPlateCostPerColour) || 0;
  const printOrderQty = Number(form.printOrderQty) || 0;
  const printRejectPercent = Number(form.printRejectPercent) || 0;
  // Plate is amortised into the per-cup rate by default; set false to bill it
  // to the customer as a separate one-time line instead.
  const amortisePrintPlate = form.amortisePrintPlate !== false;

  // RM: each shot consumes (cavities × item wt) + runner. Distribute the
  // runner across cavities, then credit the reground portion back at virgin
  // rate (cold-runner regrind is typically 90–98% recoverable in-house).
  const runnerSharePerItem = itemsPerShot > 0 ? runnerWeightPerShot / itemsPerShot : 0;
  const grossRmWeight = itemWeight + runnerSharePerItem;
  const regrindWeight = runnerSharePerItem * (regrindCapturePercent / 100);
  const netRmWeight = grossRmWeight - regrindWeight;
  const grossRmCost = (grossRmWeight * rmRate) / 1000;
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

  // Printing — dry offset on the formed cup, so it comes after forming and
  // before packing. Ink/run rate is charged per colour per cup; the plate
  // (cliché) is a one-time cost spread over the order quantity.
  const printInkCost = printColours * printRatePerColour;
  const printPlateTotal = printColours * printPlateCostPerColour;
  const printPlateCostPerItem = amortisePrintPlate && printOrderQty > 0
    ? printPlateTotal / printOrderQty
    : 0;
  const printCost = printInkCost + printPlateCostPerItem;

  // Print spoilage scraps a cup that has already been moulded, so the uplift
  // applies to forming + printing together — not to the print cost alone.
  const printedCostBase = formedCost + printCost;
  const printRejectFactor = printColours > 0 && printRejectPercent < 100
    ? 100 / (100 - printRejectPercent)
    : 1;
  const printRejectUplift = printedCostBase * (printRejectFactor - 1);
  const printedCost = printedCostBase + printRejectUplift;

  // Packing
  const innerPackCostPerItem = unitsPerSleeve > 0
    ? (innerSleeveCost + innerPackingLabour) / unitsPerSleeve
    : 0;
  const cartonCostPerItem = casePack > 0 ? cartonCost / casePack : 0;
  const totalPackingCost = innerPackCostPerItem + cartonCostPerItem;

  // Totals
  const totalMfg = printedCost + totalPackingCost;
  const profit = (totalMfg * profitPercent) / 100;
  const sellingPrice = totalMfg + profit;

  return {
    // RM
    runnerSharePerItem: round4(runnerSharePerItem),
    grossRmWeight: round4(grossRmWeight),
    regrindWeight: round4(regrindWeight),
    netRmWeight: round4(netRmWeight),
    grossRmCost: round4(grossRmCost),
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
    // Printing
    printColours,
    printInkCost: round4(printInkCost),
    printPlateTotal: round4(printPlateTotal),
    printPlateCostPerItem: round4(printPlateCostPerItem),
    printCost: round4(printCost),
    printRejectFactor: Math.round(printRejectFactor * 10000) / 10000,
    printRejectUplift: round4(printRejectUplift),
    printedCost: round4(printedCost),
    // Plate billed separately when not amortised — surface it so the quote
    // can carry it as a one-time line.
    printPlateOneTime: amortisePrintPlate ? 0 : round4(printPlateTotal),
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
