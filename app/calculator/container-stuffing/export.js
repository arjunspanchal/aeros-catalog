// Client-side exporters for the Container Stuffing Calculator.
// CSV: opens directly in Excel. PDF: print dialog (Save as PDF) on a popup
// HTML page that includes the SVG stuffing diagram + per-item orientation.

const ITEM_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];
const colorFor = (i) => ITEM_COLORS[i % ITEM_COLORS.length];
const fmt = (n, d = 0) =>
  Number.isFinite(n)
    ? n.toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d })
    : "—";
const MODE_LABEL = { floor: "FCL Floor stuffed", pallet: "FCL Pallet stuffed", lcl: "LCL (sea)" };

// ---------- helpers ----------

function escCsv(v) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------- diagram SVG (string form, for embedding in PDF HTML) ----------

function svgPalletDiagram(result) {
  const { container, items, palletPlacements, palletGrid } = result;
  if (!container || !palletPlacements || !palletGrid) return "";
  const PAD = 10;
  const MAX_W = 720;
  const scale = (MAX_W - PAD * 2) / container.L;
  const innerW = container.L * scale;
  const innerH = container.W * scale;
  const W = innerW + PAD * 2;
  const H = innerH + PAD * 2 + 20;

  const placed = palletPlacements.filter((p) => !p.overflow);
  const rects = placed
    .map((p, i) => {
      const c = colorFor(p.itemIdx);
      const x = PAD + p.x * scale;
      const y = PAD + p.y * scale;
      const w = p.w * scale;
      const h = p.h * scale;
      return `<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" fill="${c}" stroke="#222" stroke-width="0.6"/>
        <text x="${x + w / 2}" y="${y + h / 2 + 3}" text-anchor="middle" font-size="9" fill="#fff" font-weight="600">${p.itemIdx + 1}</text>`;
    })
    .join("");

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" width="100%" style="max-width:720px">
    <rect x="${PAD}" y="${PAD}" width="${innerW}" height="${innerH}" fill="#f9fafb" stroke="#9ca3af" stroke-width="1.5"/>
    <line x1="${PAD + innerW}" y1="${PAD + innerH * 0.15}" x2="${PAD + innerW}" y2="${PAD + innerH * 0.85}" stroke="#dc2626" stroke-width="3"/>
    <text x="${PAD + innerW - 4}" y="${PAD + innerH + 14}" text-anchor="end" font-size="10" fill="#6b7280">door</text>
    <text x="${PAD}" y="${PAD + innerH + 14}" font-size="10" fill="#6b7280">${container.L} mm × ${container.W} mm floor</text>
    ${rects}
  </svg>`;
}

function svgFloorDiagram(result) {
  const { container, items } = result;
  if (!container) return "";
  const focus = items.find((it) => it.qty > 0 && it.floorInfo) || items.find((it) => it.floorInfo);
  if (!focus || !focus.floorInfo) return "";
  const fi = focus.floorInfo;
  const PAD = 10;
  const MAX_W = 720;
  const scale = (MAX_W - PAD * 2) / container.L;
  const innerW = container.L * scale;
  const innerH = container.W * scale;
  const W = innerW + PAD * 2;
  const H = innerH + PAD * 2 + 20;
  const c = colorFor(items.indexOf(focus));
  const cells = [];
  for (let i = 0; i < fi.nL * fi.nW; i++) {
    const col = i % fi.nL;
    const row = Math.floor(i / fi.nL);
    const x = PAD + col * fi.cL * scale;
    const y = PAD + row * fi.cW * scale;
    const w = fi.cL * scale;
    const h = fi.cW * scale;
    cells.push(`<rect x="${x + 0.3}" y="${y + 0.3}" width="${w - 0.6}" height="${h - 0.6}" fill="${c}" fill-opacity="0.85" stroke="#222" stroke-width="0.3"/>`);
  }
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" width="100%" style="max-width:720px">
    <rect x="${PAD}" y="${PAD}" width="${innerW}" height="${innerH}" fill="#f9fafb" stroke="#9ca3af" stroke-width="1.5"/>
    <line x1="${PAD + innerW}" y1="${PAD + innerH * 0.15}" x2="${PAD + innerW}" y2="${PAD + innerH * 0.85}" stroke="#dc2626" stroke-width="3"/>
    <text x="${PAD + innerW - 4}" y="${PAD + innerH + 14}" text-anchor="end" font-size="10" fill="#6b7280">door</text>
    <text x="${PAD}" y="${PAD + innerH + 14}" font-size="10" fill="#6b7280">${container.L} mm × ${container.W} mm floor (one layer of ${focus.name || "Item " + (items.indexOf(focus) + 1)})</text>
    ${cells.join("")}
  </svg>`;
}

// Top-down view of cartons sitting on a single pallet (for "box orientation" panel).
function svgCartonsOnPallet(pallet, item, idx) {
  if (!pallet || !item.palletInfo) return "";
  const pi = item.palletInfo;
  const PAD = 8;
  const MAX_W = 260;
  const scale = (MAX_W - PAD * 2) / pallet.L;
  const innerW = pallet.L * scale;
  const innerH = pallet.W * scale;
  const W = innerW + PAD * 2;
  const H = innerH + PAD * 2 + 20;

  // Decode orientation label "L×W×H" / "W×L×H" / etc. to determine which carton dims map to pallet L/W.
  // We know cartonsPerPalletL fit along pallet L, cartonsPerPalletW along pallet W.
  // Carton dims along pallet axes: pallet.L / pi.cartonsPerPalletL × pallet.W / pi.cartonsPerPalletW (best-fit cells).
  const cellL = pallet.L / pi.cartonsPerPalletL;
  const cellW = pallet.W / pi.cartonsPerPalletW;
  const c = colorFor(idx);
  const cells = [];
  for (let r = 0; r < pi.cartonsPerPalletW; r++) {
    for (let cIdx = 0; cIdx < pi.cartonsPerPalletL; cIdx++) {
      const x = PAD + cIdx * cellL * scale;
      const y = PAD + r * cellW * scale;
      const w = cellL * scale;
      const h = cellW * scale;
      cells.push(`<rect x="${x + 0.3}" y="${y + 0.3}" width="${w - 0.6}" height="${h - 0.6}" fill="${c}" fill-opacity="0.85" stroke="#222" stroke-width="0.4"/>`);
    }
  }
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect x="${PAD}" y="${PAD}" width="${innerW}" height="${innerH}" fill="#f9fafb" stroke="#9ca3af" stroke-width="1"/>
    <text x="${PAD}" y="${PAD + innerH + 14}" font-size="9" fill="#6b7280">${pallet.L}×${pallet.W} pallet · ${pi.cartonsPerPalletL}×${pi.cartonsPerPalletW} layout × ${pi.cartonsPerPalletH} layers</text>
    ${cells.join("")}
  </svg>`;
}

// Top-down view of cartons in one floor layer (for floor-mode "box orientation" panel).
function svgCartonsInFloor(container, item, idx) {
  if (!container || !item.floorInfo) return "";
  const fi = item.floorInfo;
  const PAD = 8;
  const MAX_W = 320;
  const scale = (MAX_W - PAD * 2) / container.L;
  const innerW = container.L * scale;
  const innerH = container.W * scale;
  const W = innerW + PAD * 2;
  const H = innerH + PAD * 2 + 20;
  const c = colorFor(idx);
  const cells = [];
  for (let i = 0; i < fi.nL * fi.nW; i++) {
    const col = i % fi.nL;
    const row = Math.floor(i / fi.nL);
    const x = PAD + col * fi.cL * scale;
    const y = PAD + row * fi.cW * scale;
    const w = fi.cL * scale;
    const h = fi.cW * scale;
    cells.push(`<rect x="${x + 0.3}" y="${y + 0.3}" width="${w - 0.6}" height="${h - 0.6}" fill="${c}" fill-opacity="0.85" stroke="#222" stroke-width="0.3"/>`);
  }
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect x="${PAD}" y="${PAD}" width="${innerW}" height="${innerH}" fill="#f9fafb" stroke="#9ca3af" stroke-width="1"/>
    <text x="${PAD}" y="${PAD + innerH + 14}" font-size="9" fill="#6b7280">${fi.nL}×${fi.nW} layout × ${fi.nH} layers · orientation ${fi.orientationLabel}</text>
    ${cells.join("")}
  </svg>`;
}

// ---------- CSV ----------

export function exportStuffingCSV({ result, mode, container, pallet, ratePerWM }) {
  const lines = [];
  const push = (...cols) => lines.push(cols.map(escCsv).join(","));
  push("Aeros Container Stuffing Calculator");
  push("Date", new Date().toISOString().split("T")[0]);
  push("Mode", MODE_LABEL[mode] || mode);
  push();

  if (mode !== "lcl") {
    push("Container", container.label);
    push("Interior L (mm)", container.L);
    push("Interior W (mm)", container.W);
    push("Interior H (mm)", container.H);
    push("Max payload (kg)", container.maxPayloadKg);
    push();
  }

  if (mode === "pallet") {
    push("Pallet", pallet.label);
    push("Pallet L (mm)", pallet.L);
    push("Pallet W (mm)", pallet.W);
    push("Pallet H (mm)", pallet.H);
    push("Pallet weight (kg)", pallet.weightKg);
    push("Floor positions", result.totals.palletFloorCapacity);
    push();
  }

  // Totals
  if (mode === "lcl") {
    const t = result.totals;
    push("LCL totals");
    push("Total CBM", fmt(t.totalCBM, 3));
    push("Total weight (kg)", fmt(t.totalKg, 1));
    push("Tonnes", fmt(t.tonnes, 3));
    push("Chargeable W/M", `${fmt(t.chargeableWM, 3)} ${t.basis === "volume" ? "CBM" : "t"}`);
    push("Charged on", t.basis);
    if (ratePerWM > 0) {
      push("Rate / W·M (INR)", ratePerWM);
      push("Freight estimate (INR)", fmt(t.freight, 0));
    }
    push();
  } else {
    const t = result.totals;
    push("Container totals");
    push("Status", t.fits ? "Fits" : `Exceeds: ${t.exceeds.join(" + ")}`);
    push("Volume used (CBM)", fmt(t.totalCBM, 2));
    push("Container CBM", fmt(result.containerCBM, 2));
    push("Volume utilization (%)", fmt(t.cbmPct, 1));
    push("Weight (kg)", fmt(t.totalKg, 1));
    push("Payload limit (kg)", container.maxPayloadKg);
    push("Weight utilization (%)", fmt(t.weightPct, 1));
    if (mode === "pallet") {
      push("Pallets needed", t.totalPalletsNeeded);
      push("Pallet floor positions", t.palletFloorCapacity);
      push("Pallet utilization (%)", fmt(t.palletPct, 1));
    }
    push();
  }

  // Items table
  push("Items");
  if (mode === "pallet") {
    push("#", "Name", "L (mm)", "W (mm)", "H (mm)", "Qty", "Kg/carton", "Total CBM", "Total kg", "Max alone", "Cartons / pallet", "Pallet layout", "Pallet stack H (mm)", "Pallets needed");
    result.items.forEach((it, i) => {
      const pi = it.palletInfo;
      push(
        i + 1,
        it.name || `Item ${i + 1}`,
        it.L,
        it.W,
        it.H,
        it.qty,
        it.kg,
        fmt(it.usedCBM, 3),
        fmt(it.usedKg, 1),
        it.maxAlone,
        pi?.cartonsPerPallet || "—",
        pi ? `${pi.cartonsPerPalletL}×${pi.cartonsPerPalletW}×${pi.cartonsPerPalletH} (${pi.orientationLabel})` : "—",
        pi?.palletStackH ?? "—",
        pi?.palletsNeeded ?? "—",
      );
    });
  } else if (mode === "floor") {
    push("#", "Name", "L (mm)", "W (mm)", "H (mm)", "Qty", "Kg/carton", "Total CBM", "Total kg", "Max alone", "Floor layout", "Layers", "Orientation");
    result.items.forEach((it, i) => {
      const fi = it.floorInfo;
      push(
        i + 1,
        it.name || `Item ${i + 1}`,
        it.L,
        it.W,
        it.H,
        it.qty,
        it.kg,
        fmt(it.usedCBM, 3),
        fmt(it.usedKg, 1),
        it.maxAlone,
        fi ? `${fi.nL}×${fi.nW}` : "—",
        fi?.nH ?? "—",
        fi?.orientationLabel ?? "—",
      );
    });
  } else {
    push("#", "Name", "L (mm)", "W (mm)", "H (mm)", "Qty", "Kg/carton", "Total CBM", "Total kg");
    result.items.forEach((it, i) => {
      push(
        i + 1,
        it.name || `Item ${i + 1}`,
        it.L,
        it.W,
        it.H,
        it.qty,
        it.kg,
        fmt(it.usedCBM, 3),
        fmt(it.usedKg, 1),
      );
    });
  }

  if (mode === "pallet" && result.palletPlacements) {
    push();
    push("Container layout (pallet positions)");
    push("Slot", "Item #", "Item name", "x (mm)", "y (mm)", "Pallet L (mm)", "Pallet W (mm)", "Overflow");
    result.palletPlacements.forEach((p, i) => {
      const it = result.items[p.itemIdx];
      push(
        i + 1,
        p.itemIdx + 1,
        it?.name || `Item ${p.itemIdx + 1}`,
        p.overflow ? "—" : p.x,
        p.overflow ? "—" : p.y,
        p.overflow ? "—" : p.w,
        p.overflow ? "—" : p.h,
        p.overflow ? "yes" : "no",
      );
    });
  }

  const csv = "﻿" + lines.join("\n");
  const filename = `aeros-stuffing-${mode}-${new Date().toISOString().split("T")[0]}.csv`;
  downloadBlob(filename, new Blob([csv], { type: "text/csv;charset=utf-8" }));
}

// ---------- PDF (popup HTML → print) ----------

export function exportStuffingPDF({ result, mode, container, pallet, ratePerWM }) {
  const date = new Date().toISOString().split("T")[0];
  const t = result.totals;
  const isLCL = mode === "lcl";
  const isPallet = mode === "pallet";

  const statusBlock = isLCL
    ? `<div class="status lcl">
         <div class="label">LCL · charged on ${t.basis}</div>
         <div class="grid3">
           <div><div class="k">Total CBM</div><div class="v">${fmt(t.totalCBM, 3)}</div></div>
           <div><div class="k">Total weight</div><div class="v">${fmt(t.totalKg, 1)} kg (${fmt(t.tonnes, 3)} t)</div></div>
           <div><div class="k">Chargeable W/M</div><div class="v">${fmt(t.chargeableWM, 3)} ${t.basis === "volume" ? "CBM" : "t"}</div></div>
         </div>
         ${ratePerWM > 0 ? `<div class="muted">Freight estimate: ₹${fmt(t.freight, 0)} (${fmt(t.chargeableWM, 3)} × ₹${fmt(ratePerWM, 0)})</div>` : ""}
       </div>`
    : `<div class="status ${t.fits ? "ok" : "bad"}">
         <div class="label">${t.fits ? "Fits in container" : `Exceeds ${t.exceeds.join(" + ")}`}</div>
         <div class="grid3">
           <div><div class="k">Volume</div><div class="v">${fmt(t.totalCBM, 2)} / ${fmt(result.containerCBM, 2)} CBM</div><div class="muted">${fmt(t.cbmPct, 1)}%</div></div>
           <div><div class="k">Weight</div><div class="v">${fmt(t.totalKg, 1)} / ${fmt(container.maxPayloadKg)} kg</div><div class="muted">${fmt(t.weightPct, 1)}%</div></div>
           ${isPallet && t.palletFloorCapacity > 0 ? `<div><div class="k">Pallets</div><div class="v">${fmt(t.totalPalletsNeeded)} / ${fmt(t.palletFloorCapacity)}</div><div class="muted">${fmt(t.palletPct, 1)}%</div></div>` : "<div></div>"}
         </div>
       </div>`;

  const itemsRows = result.items
    .map((it, i) => {
      const swatch = `<span class="dot" style="background:${colorFor(i)}"></span>`;
      const baseCols = `
        <td>${swatch}${it.name || `Item ${i + 1}`}<div class="muted">${it.L} × ${it.W} × ${it.H} mm</div></td>
        <td class="r">${fmt(it.qty)}</td>
        <td class="r">${fmt(it.usedCBM, 3)}</td>
        <td class="r">${fmt(it.usedKg, 1)} kg</td>`;
      if (isLCL) return `<tr>${baseCols}</tr>`;
      const extras = isPallet
        ? `<td class="r">${fmt(it.maxAlone)}</td>
           <td class="r">${it.palletInfo ? fmt(it.palletInfo.cartonsPerPallet) : "—"}</td>
           <td class="r">${it.palletInfo ? fmt(it.palletInfo.palletsNeeded) : "—"}</td>`
        : `<td class="r">${fmt(it.maxAlone)}</td>
           <td class="r">${it.floorInfo ? `${it.floorInfo.nL}×${it.floorInfo.nW}×${it.floorInfo.nH}` : "—"}</td>
           <td class="r">${it.floorInfo?.orientationLabel || "—"}</td>`;
      return `<tr>${baseCols}${extras}</tr>`;
    })
    .join("");

  const itemsHeader = isLCL
    ? "<tr><th>Item</th><th class='r'>Qty</th><th class='r'>CBM</th><th class='r'>Weight</th></tr>"
    : isPallet
    ? "<tr><th>Item</th><th class='r'>Qty</th><th class='r'>CBM</th><th class='r'>Weight</th><th class='r'>Max alone</th><th class='r'>Cartons / pallet</th><th class='r'>Pallets needed</th></tr>"
    : "<tr><th>Item</th><th class='r'>Qty</th><th class='r'>CBM</th><th class='r'>Weight</th><th class='r'>Max alone</th><th class='r'>Layout</th><th class='r'>Orientation</th></tr>";

  // Container layout diagram
  const layoutSVG = isLCL ? "" : isPallet ? svgPalletDiagram(result) : svgFloorDiagram(result);
  const legend = isPallet
    ? result.items
        .map((it, i) => {
          const need = it.palletInfo?.palletsNeeded || 0;
          if (need === 0) return "";
          return `<span class="legend"><span class="dot" style="background:${colorFor(i)}"></span> ${i + 1}. ${it.name || `Item ${i + 1}`} · ${need} pallet${need !== 1 ? "s" : ""}</span>`;
        })
        .filter(Boolean)
        .join("")
    : "";

  // Per-item box-orientation panels
  const orientationPanels = isLCL
    ? ""
    : result.items
        .map((it, i) => {
          if (it.qty === 0 && !it.palletInfo && !it.floorInfo) return "";
          const swatch = `<span class="dot" style="background:${colorFor(i)}"></span>`;
          const title = `${swatch}<strong>${it.name || `Item ${i + 1}`}</strong> · ${it.L} × ${it.W} × ${it.H} mm`;
          if (isPallet && it.palletInfo) {
            const pi = it.palletInfo;
            return `<div class="panel">
              <div class="panel-title">${title}</div>
              <div class="panel-body">
                ${svgCartonsOnPallet(pallet, it, i)}
                <div class="panel-text">
                  <div><strong>Box orientation:</strong> ${pi.orientationLabel}</div>
                  <div><strong>Per pallet:</strong> ${pi.cartonsPerPalletL} × ${pi.cartonsPerPalletW} × ${pi.cartonsPerPalletH} = ${fmt(pi.cartonsPerPallet)} cartons</div>
                  <div><strong>Stack height:</strong> ${fmt(pi.palletStackH)} mm (incl. pallet)</div>
                  <div><strong>Pallets needed:</strong> ${fmt(pi.palletsNeeded)}</div>
                </div>
              </div>
            </div>`;
          }
          if (!isPallet && it.floorInfo) {
            const fi = it.floorInfo;
            return `<div class="panel">
              <div class="panel-title">${title}</div>
              <div class="panel-body">
                ${svgCartonsInFloor(container, it, i)}
                <div class="panel-text">
                  <div><strong>Box orientation:</strong> ${fi.orientationLabel}</div>
                  <div><strong>Per layer:</strong> ${fi.nL} × ${fi.nW} = ${fmt(fi.nL * fi.nW)} cartons</div>
                  <div><strong>Layers:</strong> ${fi.nH}</div>
                  <div><strong>Max alone:</strong> ${fmt(it.maxAlone)} cartons</div>
                </div>
              </div>
            </div>`;
          }
          return "";
        })
        .join("");

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Aeros Container Stuffing — ${MODE_LABEL[mode]}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, system-ui, sans-serif; color: #111; margin: 32px; max-width: 800px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 14px; margin: 24px 0 8px; color: #1e40af; }
  .muted { color: #666; font-size: 11px; }
  .status { padding: 16px; border-radius: 12px; margin: 16px 0; border: 1px solid; }
  .status.ok { background: #ecfdf5; border-color: #6ee7b7; }
  .status.bad { background: #fef2f2; border-color: #fca5a5; }
  .status.lcl { background: #eff6ff; border-color: #93c5fd; }
  .status .label { font-size: 13px; font-weight: 700; margin-bottom: 8px; }
  .grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .k { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
  .v { font-size: 14px; font-weight: 600; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 12px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #eee; vertical-align: top; }
  th { font-size: 10px; text-transform: uppercase; color: #666; letter-spacing: 0.5px; }
  td.r, th.r { text-align: right; }
  .dot { display: inline-block; width: 9px; height: 9px; border-radius: 2px; margin-right: 6px; vertical-align: middle; }
  .legend { display: inline-block; margin-right: 12px; font-size: 11px; }
  .specs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px 16px; font-size: 12px; margin: 4px 0 12px; }
  .specs .k { font-size: 10px; }
  .panel { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; margin: 8px 0; page-break-inside: avoid; }
  .panel-title { font-size: 12px; margin-bottom: 6px; }
  .panel-body { display: flex; gap: 12px; align-items: flex-start; }
  .panel-text { font-size: 11px; line-height: 1.6; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #eee; font-size: 10px; color: #888; }
  @media print { body { margin: 16px; } h2 { page-break-after: avoid; } }
</style></head><body>

<h1>Aeros Container Stuffing</h1>
<div class="muted">${MODE_LABEL[mode]} · ${date}</div>

${statusBlock}

${
  isLCL
    ? ""
    : `<h2>${isPallet ? "Container & pallet" : "Container"}</h2>
       <div class="specs">
         <div><div class="k">Container</div><div>${container.label}</div></div>
         <div><div class="k">Interior</div><div>${container.L} × ${container.W} × ${container.H} mm</div></div>
         <div><div class="k">Max payload</div><div>${fmt(container.maxPayloadKg)} kg</div></div>
         ${
           isPallet
             ? `<div><div class="k">Pallet</div><div>${pallet.label}</div></div>
                <div><div class="k">Pallet dims</div><div>${pallet.L} × ${pallet.W} × ${pallet.H} mm</div></div>
                <div><div class="k">Floor positions</div><div>${result.totals.palletFloorCapacity}</div></div>`
             : ""
         }
       </div>`
}

<h2>Items</h2>
<table><thead>${itemsHeader}</thead><tbody>${itemsRows}</tbody></table>

${
  layoutSVG
    ? `<h2>Container layout — top-down</h2>
       ${layoutSVG}
       ${legend ? `<div style="margin-top:6px">${legend}</div>` : ""}`
    : ""
}

${orientationPanels ? `<h2>Box orientation${isPallet ? " & pallet positioning" : ""}</h2>${orientationPanels}` : ""}

<div class="footer">
  Block-stack only — no interlocking or pinwheel patterns. Treat as a planning ceiling; real stuffing loses 5–10% to door clearance and gaps.
  Generated ${date}.
</div>

<script>window.onload = () => setTimeout(() => window.print(), 300);</script>
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) { alert("Popup blocked — please allow popups to export PDFs."); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
