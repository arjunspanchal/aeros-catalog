// Container stuffing math. Pure helpers — no I/O, no React.
// Approach: block-stack only (no 3D bin packing). For each candidate
// carton orientation, compute floor(C_dim / box_dim) on each axis and
// multiply. Pick the orientation with the most cartons that still
// respects the container's max payload weight.

// Internal dimensions in mm; max payload in kg. Numbers are typical
// industry values for dry containers (small variation between lines is
// normal — these are conservative defaults).
export const CONTAINERS = [
  {
    id: "20ft",
    label: "20ft Standard (GP)",
    L: 5898,
    W: 2352,
    H: 2393,
    maxPayloadKg: 28200,
  },
  {
    id: "40ft",
    label: "40ft Standard (GP)",
    L: 12032,
    W: 2352,
    H: 2393,
    maxPayloadKg: 28800,
  },
  {
    id: "40ft_hc",
    label: "40ft High Cube (HC)",
    L: 12032,
    W: 2352,
    H: 2698,
    maxPayloadKg: 28600,
  },
  {
    id: "45ft_hc",
    label: "45ft High Cube (HC)",
    L: 13582,
    W: 2352,
    H: 2698,
    maxPayloadKg: 27600,
  },
];

export function getContainer(id) {
  return CONTAINERS.find((c) => c.id === id) || CONTAINERS[0];
}

// Common export pallets. Heights are pallet-only (cartons sit on top).
export const PALLETS = [
  { id: "euro", label: "Euro pallet (1200×800)", L: 1200, W: 800, H: 145, weightKg: 25 },
  { id: "iso", label: "ISO standard (1200×1000)", L: 1200, W: 1000, H: 145, weightKg: 30 },
  { id: "us", label: "US 48×40 in (1219×1016)", L: 1219, W: 1016, H: 145, weightKg: 30 },
];

export function getPallet(id) {
  return PALLETS.find((p) => p.id === id) || PALLETS[0];
}

// All 6 unique permutations of (cL, cW, cH).
function orientations(cL, cW, cH) {
  return [
    { cL, cW, cH, label: "L×W×H" },
    { cL, cW: cH, cH: cW, label: "L×H×W" },
    { cL: cW, cW: cL, cH, label: "W×L×H" },
    { cL: cW, cW: cH, cH: cL, label: "W×H×L" },
    { cL: cH, cW: cL, cH: cW, label: "H×L×W" },
    { cL: cH, cW, cH: cL, label: "H×W×L" },
  ];
}

// Block-stack any rectangular box into any rectangular space.
// keepUpright restricts to L↔W swap only.
function bestBlockStack({ spaceL, spaceW, spaceH, boxL, boxW, boxH, keepUpright }) {
  if (!(spaceL > 0 && spaceW > 0 && spaceH > 0 && boxL > 0 && boxW > 0 && boxH > 0)) {
    return null;
  }
  const orients = keepUpright
    ? [
        { cL: boxL, cW: boxW, cH: boxH, label: "L×W×H" },
        { cL: boxW, cW: boxL, cH: boxH, label: "W×L×H" },
      ]
    : orientations(boxL, boxW, boxH);
  let best = null;
  for (const o of orients) {
    if (o.cL > spaceL || o.cW > spaceW || o.cH > spaceH) continue;
    const nL = Math.floor(spaceL / o.cL);
    const nW = Math.floor(spaceW / o.cW);
    const nH = Math.floor(spaceH / o.cH);
    const total = nL * nW * nH;
    if (!best || total > best.total) best = { ...o, nL, nW, nH, total };
  }
  return best;
}

/**
 * Floor-stuff: cartons go straight onto the container floor.
 *
 * @param {object} args
 * @param {object} args.container - {L, W, H, maxPayloadKg} all in mm/kg
 * @param {number} args.cartonL - carton length (mm)
 * @param {number} args.cartonW - carton width (mm)
 * @param {number} args.cartonH - carton height (mm)
 * @param {number} args.cartonKg - per-carton weight (kg). 0 = ignore weight cap.
 * @param {number} args.availableCartons - cap on how many we have. 0 = ignore.
 * @param {boolean} args.keepUpright - if true, only allow swapping L/W (H stays).
 */
export function calcFloorStuff({
  container,
  cartonL,
  cartonW,
  cartonH,
  cartonKg = 0,
  availableCartons = 0,
  keepUpright = false,
}) {
  const errors = [];
  if (!container || !container.L) errors.push("Pick a container.");
  if (!(cartonL > 0)) errors.push("Carton length must be > 0.");
  if (!(cartonW > 0)) errors.push("Carton width must be > 0.");
  if (!(cartonH > 0)) errors.push("Carton height must be > 0.");
  if (errors.length) return { mode: "floor", errors, candidates: [], best: null };

  const all = keepUpright
    ? [
        { cL: cartonL, cW: cartonW, cH: cartonH, label: "L×W×H" },
        { cL: cartonW, cW: cartonL, cH: cartonH, label: "W×L×H" },
      ]
    : orientations(cartonL, cartonW, cartonH);

  const cap = container.maxPayloadKg;
  const candidates = all
    .map((o) => {
      if (o.cL > container.L || o.cW > container.W || o.cH > container.H) {
        return { ...o, fitsAxis: false, cartons: 0 };
      }
      const nL = Math.floor(container.L / o.cL);
      const nW = Math.floor(container.W / o.cW);
      const nH = Math.floor(container.H / o.cH);
      let cartons = nL * nW * nH;
      let weightCapped = false;
      if (cartonKg > 0 && cap > 0) {
        const maxByWeight = Math.floor(cap / cartonKg);
        if (maxByWeight < cartons) {
          cartons = maxByWeight;
          weightCapped = true;
        }
      }
      let qtyCapped = false;
      if (availableCartons > 0 && availableCartons < cartons) {
        cartons = availableCartons;
        qtyCapped = true;
      }
      return {
        ...o,
        fitsAxis: true,
        nL,
        nW,
        nH,
        cartons,
        weightCapped,
        qtyCapped,
      };
    })
    .sort((a, b) => b.cartons - a.cartons);

  const best = candidates[0] && candidates[0].cartons > 0 ? candidates[0] : null;

  const containerCBM = (container.L * container.W * container.H) / 1e9;
  const result = {
    mode: "floor",
    errors: [],
    container,
    containerCBM,
    candidates,
    best: null,
  };
  if (best) {
    const cartonCBM = (cartonL * cartonW * cartonH) / 1e9;
    const usedCBM = best.cartons * cartonCBM;
    const utilPct = containerCBM > 0 ? (usedCBM / containerCBM) * 100 : 0;
    const totalKg = cartonKg > 0 ? best.cartons * cartonKg : 0;
    const payloadPct =
      cartonKg > 0 && cap > 0 ? (totalKg / cap) * 100 : 0;
    result.best = {
      ...best,
      cartonCBM,
      usedCBM,
      utilPct,
      totalKg,
      payloadPct,
    };
  }
  return result;
}

/**
 * Pallet-stuff: cartons block-stacked onto each pallet, then pallets onto
 * the container floor. Pallets stay upright (no tipping); cartons can
 * still rotate within the pallet footprint per `keepUpright`.
 *
 * @param {object} args
 * @param {object} args.container - container spec
 * @param {object} args.pallet - {L, W, H, weightKg}
 * @param {number} args.maxLoadHeight - max total height of pallet+cartons (mm). 0 = use container interior height.
 * @param {number} args.cartonL,cartonW,cartonH - carton dims (mm)
 * @param {number} args.cartonKg - per-carton weight (kg)
 * @param {number} args.availableCartons - stock cap
 * @param {boolean} args.keepUpright - cartons keep upright on pallet
 */
export function calcPalletStuff({
  container,
  pallet,
  maxLoadHeight = 0,
  cartonL,
  cartonW,
  cartonH,
  cartonKg = 0,
  availableCartons = 0,
  keepUpright = false,
}) {
  const errors = [];
  if (!container || !container.L) errors.push("Pick a container.");
  if (!pallet || !pallet.L) errors.push("Pick a pallet.");
  if (!(cartonL > 0)) errors.push("Carton length must be > 0.");
  if (!(cartonW > 0)) errors.push("Carton width must be > 0.");
  if (!(cartonH > 0)) errors.push("Carton height must be > 0.");
  if (errors.length) return { mode: "pallet", errors, best: null };

  const cap = container.maxPayloadKg;
  // How tall the carton stack on the pallet can be.
  const totalH = maxLoadHeight > 0 ? Math.min(maxLoadHeight, container.H) : container.H;
  const stackH = Math.max(0, totalH - pallet.H);

  // Cartons on a single pallet — block-stack within pallet footprint and stack height.
  const onPallet = bestBlockStack({
    spaceL: pallet.L,
    spaceW: pallet.W,
    spaceH: stackH,
    boxL: cartonL,
    boxW: cartonW,
    boxH: cartonH,
    keepUpright,
  });
  if (!onPallet || onPallet.total === 0) {
    return {
      mode: "pallet",
      errors: ["Carton doesn't fit on this pallet within the load height."],
      best: null,
    };
  }

  // Pallets on the container floor — flat (height stays at pallet+stack).
  // Try both pallet orientations on the floor (1200×800 vs 800×1200).
  const palletStackH = pallet.H + (stackH > 0 ? Math.floor(stackH / onPallet.cH) * onPallet.cH : 0);
  // Pallet itself can swap L↔W on the floor; we don't tip pallets.
  const palletOnFloor = bestBlockStack({
    spaceL: container.L,
    spaceW: container.W,
    spaceH: container.H, // height isn't the constraint here — palletStackH already capped
    boxL: pallet.L,
    boxW: pallet.W,
    boxH: palletStackH,
    keepUpright: true, // never tip pallets
  });
  if (!palletOnFloor || palletOnFloor.total === 0) {
    return {
      mode: "pallet",
      errors: ["Pallet doesn't fit in this container."],
      best: null,
    };
  }
  // palletOnFloor.nH should be 1 — pallets aren't stacked on top of each other in standard stuffing.
  const palletsCount = palletOnFloor.nL * palletOnFloor.nW;

  let cartons = palletsCount * onPallet.total;
  let weightCapped = false;
  if (cartonKg > 0 && cap > 0) {
    // Weight cap considers cartons + pallet weight.
    const palletKg = pallet.weightKg || 0;
    const totalLoad = cartons * cartonKg + palletsCount * palletKg;
    if (totalLoad > cap) {
      // Reduce cartons to fit weight.
      const remaining = Math.max(0, cap - palletsCount * palletKg);
      cartons = Math.floor(remaining / cartonKg);
      weightCapped = true;
    }
  }
  let qtyCapped = false;
  if (availableCartons > 0 && availableCartons < cartons) {
    cartons = availableCartons;
    qtyCapped = true;
  }

  const containerCBM = (container.L * container.W * container.H) / 1e9;
  const cartonCBM = (cartonL * cartonW * cartonH) / 1e9;
  const usedCBM = cartons * cartonCBM;
  const utilPct = containerCBM > 0 ? (usedCBM / containerCBM) * 100 : 0;
  const totalKg = cartonKg > 0 ? cartons * cartonKg + palletsCount * (pallet.weightKg || 0) : 0;
  const payloadPct = cartonKg > 0 && cap > 0 ? (totalKg / cap) * 100 : 0;

  return {
    mode: "pallet",
    errors: [],
    container,
    pallet,
    containerCBM,
    cartonCBM,
    usedCBM,
    palletStackH,
    palletsPerFloorL: palletOnFloor.nL,
    palletsPerFloorW: palletOnFloor.nW,
    palletsCount,
    palletFootprintLabel: palletOnFloor.label,
    cartonsPerPallet: onPallet.total,
    cartonsPerPalletLabel: onPallet.label,
    cartonsPerPalletL: onPallet.nL,
    cartonsPerPalletW: onPallet.nW,
    cartonsPerPalletH: onPallet.nH,
    cartons,
    weightCapped,
    qtyCapped,
    utilPct,
    totalKg,
    payloadPct,
  };
}

// Convert any input length to mm given the unit.
export function toMM(value, unit) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  if (unit === "cm") return n * 10;
  if (unit === "in") return n * 25.4;
  if (unit === "m") return n * 1000;
  return n; // mm
}

/**
 * Mixed-load: multiple items planned into one container. Container space
 * sharing isn't 3D-packed — we use CBM + weight totals against the container
 * cap, plus a per-item single-SKU max-fit reference. Real loaders judge final
 * placement; this gives a planning ceiling.
 *
 * @param {object} args
 * @param {object} args.container - {L, W, H, maxPayloadKg}
 * @param {string} args.mode - "floor" | "pallet"
 * @param {object|null} args.pallet - required when mode === "pallet"
 * @param {number} args.maxLoadHeight - pallet mode only; mm
 * @param {boolean} args.keepUpright
 * @param {Array<{name?: string, L: number, W: number, H: number, qty: number, kg: number}>} args.items
 *        - dims already in mm
 */
export function calcMixedLoad({
  container,
  mode = "floor",
  pallet = null,
  maxLoadHeight = 0,
  keepUpright = false,
  items = [],
}) {
  const errors = [];
  if (!container || !container.L) errors.push("Pick a container.");
  if (mode === "pallet" && (!pallet || !pallet.L)) errors.push("Pick a pallet.");
  const goodItems = items.filter((it) => it && it.L > 0 && it.W > 0 && it.H > 0);
  if (goodItems.length === 0) errors.push("Add at least one item with full dimensions.");
  if (errors.length) return { mode, errors, items: [], totals: null };

  const containerCBM = (container.L * container.W * container.H) / 1e9;
  const cap = container.maxPayloadKg;

  const perItem = goodItems.map((it) => {
    const qty = Math.max(0, Number(it.qty) || 0);
    const kg = Math.max(0, Number(it.kg) || 0);
    const cartonCBM = (it.L * it.W * it.H) / 1e9;
    const usedCBM = qty * cartonCBM;
    const usedKg = qty * kg;

    let maxAlone = 0;
    let palletInfo = null;
    let floorInfo = null;
    if (mode === "pallet" && pallet) {
      const r = calcPalletStuff({
        container,
        pallet,
        maxLoadHeight,
        cartonL: it.L,
        cartonW: it.W,
        cartonH: it.H,
        cartonKg: kg,
        keepUpright,
      });
      maxAlone = r && r.cartons ? r.cartons : 0;
      if (r && r.cartonsPerPallet > 0) {
        palletInfo = {
          cartonsPerPallet: r.cartonsPerPallet,
          cartonsPerPalletL: r.cartonsPerPalletL,
          cartonsPerPalletW: r.cartonsPerPalletW,
          cartonsPerPalletH: r.cartonsPerPalletH,
          orientationLabel: r.cartonsPerPalletLabel,
          palletStackH: r.palletStackH,
          palletsNeeded: qty > 0 ? Math.ceil(qty / r.cartonsPerPallet) : 0,
        };
      }
    } else {
      const r = calcFloorStuff({
        container,
        cartonL: it.L,
        cartonW: it.W,
        cartonH: it.H,
        cartonKg: kg,
        keepUpright,
      });
      maxAlone = r && r.best ? r.best.cartons : 0;
      if (r && r.best) {
        floorInfo = {
          orientationLabel: r.best.label,
          nL: r.best.nL,
          nW: r.best.nW,
          nH: r.best.nH,
          cL: r.best.cL,
          cW: r.best.cW,
          cH: r.best.cH,
        };
      }
    }

    return {
      name: it.name || "",
      L: it.L,
      W: it.W,
      H: it.H,
      qty,
      kg,
      cartonCBM,
      usedCBM,
      usedKg,
      maxAlone,
      palletInfo,
      floorInfo,
    };
  });

  const totalCBM = perItem.reduce((s, x) => s + x.usedCBM, 0);
  const totalKg = perItem.reduce((s, x) => s + x.usedKg, 0);
  const totalPalletsNeeded =
    mode === "pallet"
      ? perItem.reduce((s, x) => s + (x.palletInfo?.palletsNeeded || 0), 0)
      : 0;

  // Pallet floor capacity: how many pallet footprints fit on the container floor.
  // Pick the orientation with the most positions and remember it for the diagram.
  let palletFloorCapacity = 0;
  let palletGrid = null; // { cols, rows, palletL, palletW }
  if (mode === "pallet" && pallet) {
    const colsA = Math.floor(container.L / pallet.L);
    const rowsA = Math.floor(container.W / pallet.W);
    const colsB = Math.floor(container.L / pallet.W);
    const rowsB = Math.floor(container.W / pallet.L);
    const capA = colsA * rowsA;
    const capB = colsB * rowsB;
    if (capB > capA) {
      palletFloorCapacity = capB;
      palletGrid = { cols: colsB, rows: rowsB, palletL: pallet.W, palletW: pallet.L };
    } else {
      palletFloorCapacity = capA;
      palletGrid = { cols: colsA, rows: rowsA, palletL: pallet.L, palletW: pallet.W };
    }
  }

  const cbmPct = containerCBM > 0 ? (totalCBM / containerCBM) * 100 : 0;
  const weightPct = cap > 0 ? (totalKg / cap) * 100 : 0;
  const palletPct = palletFloorCapacity > 0 ? (totalPalletsNeeded / palletFloorCapacity) * 100 : 0;

  const exceeds = [];
  if (totalCBM > containerCBM) exceeds.push("volume");
  if (cap > 0 && totalKg > cap) exceeds.push("payload weight");
  if (mode === "pallet" && palletFloorCapacity > 0 && totalPalletsNeeded > palletFloorCapacity) {
    exceeds.push("pallet floor space");
  }

  // Lay pallets out on the container floor, item-by-item, row-major.
  // Returns placements for the diagram. Overflow pallets are flagged.
  let palletPlacements = null;
  if (mode === "pallet" && palletGrid) {
    palletPlacements = [];
    let pos = 0;
    perItem.forEach((it, idx) => {
      const need = it.palletInfo?.palletsNeeded || 0;
      for (let k = 0; k < need; k++) {
        if (pos >= palletFloorCapacity) {
          palletPlacements.push({ overflow: true, itemIdx: idx });
        } else {
          const col = pos % palletGrid.cols;
          const row = Math.floor(pos / palletGrid.cols);
          palletPlacements.push({
            overflow: false,
            itemIdx: idx,
            x: col * palletGrid.palletL,
            y: row * palletGrid.palletW,
            w: palletGrid.palletL,
            h: palletGrid.palletW,
          });
          pos++;
        }
      }
    });
  }

  return {
    mode,
    errors: [],
    container,
    pallet,
    containerCBM,
    items: perItem,
    palletGrid,
    palletPlacements,
    totals: {
      totalCBM,
      totalKg,
      cbmPct,
      weightPct,
      totalPalletsNeeded,
      palletFloorCapacity,
      palletPct,
      exceeds,
      fits: exceeds.length === 0,
    },
  };
}

/**
 * LCL (Less than Container Load) — no container fit logic. Just sum CBM
 * and weight, then compute chargeable W/M (whichever is greater of CBM
 * or metric tons). Optional rate gives the freight estimate.
 */
export function calcLCL({ items = [], ratePerWM = 0 }) {
  const errors = [];
  const goodItems = items.filter((it) => it && it.L > 0 && it.W > 0 && it.H > 0);
  if (goodItems.length === 0) errors.push("Add at least one item with full dimensions.");
  if (errors.length) return { mode: "lcl", errors, items: [], totals: null };

  const perItem = goodItems.map((it) => {
    const qty = Math.max(0, Number(it.qty) || 0);
    const kg = Math.max(0, Number(it.kg) || 0);
    const cartonCBM = (it.L * it.W * it.H) / 1e9;
    const usedCBM = qty * cartonCBM;
    const usedKg = qty * kg;
    return { name: it.name || "", L: it.L, W: it.W, H: it.H, qty, kg, cartonCBM, usedCBM, usedKg };
  });

  const totalCBM = perItem.reduce((s, x) => s + x.usedCBM, 0);
  const totalKg = perItem.reduce((s, x) => s + x.usedKg, 0);
  // Chargeable W/M: greater of CBM or metric tons (1 t = 1000 kg).
  const tonnes = totalKg / 1000;
  const chargeableWM = Math.max(totalCBM, tonnes);
  const basis = totalCBM >= tonnes ? "volume" : "weight";
  const freight = ratePerWM > 0 ? chargeableWM * ratePerWM : 0;

  return {
    mode: "lcl",
    errors: [],
    items: perItem,
    totals: { totalCBM, totalKg, tonnes, chargeableWM, basis, ratePerWM, freight },
  };
}
