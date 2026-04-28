// PP item quote exports — CSV (Excel) + PDF (browser print). Mirrors the
// pattern in ./export.js for paper bags. Runs entirely in the browser.

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

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

export function exportPpCSV({ form, result, filename }) {
  const lines = [];
  const push = (...cols) => lines.push(cols.map(escCsv).join(","));
  const today = new Date().toISOString().split("T")[0];

  push("Aeros PP Item Rate Calculator");
  push("Quote ref", form.quoteRef || "—");
  push("Item", form.itemName || "—");
  push("Date", today);
  push();

  push("Item specifications");
  push("Item weight (g)", form.itemWeight);
  push("Cavities (items per shot)", form.itemsPerShot);
  push("Cycle time (s)", form.cycleTime);
  push("RM rate (₹/kg)", form.rmRate);
  push("Runner weight per shot (g)", form.runnerWeightPerShot);
  push("Runner share per item (g)", result.runnerSharePerItem);
  push("Regrind capture (%)", form.regrindCapturePercent);
  push();

  push("Throughput");
  push("Items / minute", result.itemsPerMin.toFixed(2));
  push("Items / hour", result.itemsPerHr.toFixed(0));
  push("Units / shift", result.unitsPerShift);
  push("Units / day", result.unitsPerDay);
  push("Shift hours", form.shiftHrs);
  push("Shifts per day", form.shiftsPerDay);
  push("Labour cost per day (₹)", form.labourCostPerDay);
  push();

  push("Energy & tooling");
  push("Machine power (kW)", form.machinePowerKw);
  push("Electricity tariff (₹/kWh)", form.electricityRate);
  push("Mold cost (₹)", form.moldCost);
  push("Mold life (shots)", form.moldLifeShots);
  push("Reject %", form.rejectPercent);
  push();

  push("Packing");
  push("Inner sleeve cost (₹)", form.innerSleeveCost);
  push("Inner packing labour (₹)", form.innerPackingLabour);
  push("Units per sleeve", form.unitsPerSleeve);
  push("Carton cost (₹)", form.cartonCost);
  push("Case pack", form.casePack);
  push();

  push("Cost breakdown (₹ / item)");
  push("Gross RM (item + runner share)", result.grossRmCost.toFixed(4));
  if (result.regrindCredit > 0) push("Regrind credit", `-${result.regrindCredit.toFixed(4)}`);
  push("Net RM", result.rmCost.toFixed(4));
  push("Labour / item", result.labourCostPerItem.toFixed(4));
  if (result.electricityCostPerItem > 0) push("Electricity", result.electricityCostPerItem.toFixed(4));
  if (result.moldCostPerItem > 0) push("Mold amortisation", result.moldCostPerItem.toFixed(4));
  if (result.rejectUplift > 0) push(`Reject uplift (${form.rejectPercent}%)`, result.rejectUplift.toFixed(4));
  push("Per-part subtotal", result.formedCost.toFixed(4));
  push("Inner packing", result.innerPackCostPerItem.toFixed(4));
  push("Carton", result.cartonCostPerItem.toFixed(4));
  push("Total packing", result.totalPackingCost.toFixed(4));
  push("Manufacturing cost", result.totalMfg.toFixed(4));
  push(`Profit (${result.profitPct}%)`, result.profit.toFixed(4));
  push("Selling price / item", result.sellingPrice.toFixed(4));
  push(`Selling price / case (${form.casePack})`, result.spPerCase.toFixed(2));

  const csv = "﻿" + lines.join("\n"); // BOM so Excel opens UTF-8 correctly
  const safeName = (form.quoteRef || form.itemName || "pp-quote").replace(/\s+/g, "-").replace(/[^\w.-]/g, "");
  const name = filename || `aeros-pp-${safeName}.csv`;
  downloadBlob(name, new Blob([csv], { type: "text/csv;charset=utf-8" }));
}

export function exportPpPDF({ form, result }) {
  const today = new Date().toISOString().split("T")[0];
  const refLabel = form.quoteRef || form.itemName || "PP Item";

  const ladderRow = (label, val, opts = {}) => `
    <tr class="${opts.highlight ? "highlight" : ""} ${opts.total ? "total" : ""}">
      <td>${escapeHtml(label)}</td>
      <td>${val < 0 ? "−" : ""}₹${Math.abs(Number(val)).toFixed(opts.cents ? 2 : 4)}</td>
    </tr>`;

  const ladder = [];
  ladder.push(ladderRow("Gross RM (item + runner share)", result.grossRmCost));
  if (result.regrindCredit > 0) ladder.push(ladderRow(`− Regrind credit (${form.regrindCapturePercent}%)`, -result.regrindCredit));
  ladder.push(ladderRow("Net RM", result.rmCost));
  ladder.push(ladderRow("Labour / item", result.labourCostPerItem));
  if (result.electricityCostPerItem > 0) ladder.push(ladderRow("Electricity", result.electricityCostPerItem));
  if (result.moldCostPerItem > 0) ladder.push(ladderRow("Mold amortisation", result.moldCostPerItem));
  if (result.rejectUplift > 0) ladder.push(ladderRow(`Reject uplift (${form.rejectPercent}%)`, result.rejectUplift));
  ladder.push(ladderRow("Per-part subtotal", result.formedCost, { total: true }));
  ladder.push(ladderRow("Inner packing", result.innerPackCostPerItem));
  ladder.push(ladderRow("Carton", result.cartonCostPerItem));
  ladder.push(ladderRow("Mfg cost / item", result.totalMfg, { total: true }));
  ladder.push(ladderRow(`Profit (${result.profitPct}%)`, result.profit));
  ladder.push(ladderRow("Selling price / item", result.sellingPrice, { highlight: true, cents: true }));

  const specRow = (k, v) => `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`;

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Aeros PP Quote — ${escapeHtml(refLabel)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111827; max-width: 820px; margin: 2rem auto; padding: 0 2rem; line-height: 1.4; }
  h1 { font-size: 22px; font-weight: 700; margin: 0 0 0.25rem; }
  .ref { font-size: 13px; color: #6b7280; margin: 0 0 2rem; }
  .ref strong { color: #111827; }
  h2 { font-size: 16px; font-weight: 600; color: #6d28d9; margin: 2rem 0 0.75rem; }
  .hero-label { font-size: 13px; color: #6b7280; margin: 1.5rem 0 0.25rem; }
  .hero-price { font-size: 48px; font-weight: 700; color: #111827; letter-spacing: -0.5px; line-height: 1; }
  .hero-sub { font-size: 13px; color: #6b7280; margin-top: 0.5rem; }
  table.spec, table.ladder { width: 100%; border-collapse: collapse; margin: 0.5rem 0; }
  table.spec td, table.ladder td { padding: 12px 0; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
  table.spec td:first-child, table.ladder td:first-child { color: #4b5563; }
  table.spec td:last-child { text-align: right; color: #111827; font-weight: 500; }
  table.ladder td:last-child { text-align: right; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; color: #111827; }
  table.ladder tr.total td { font-weight: 600; font-size: 15px; }
  table.ladder tr.highlight td { background: #f5f3ff; font-weight: 700; font-size: 15px; color: #6d28d9; padding-left: 12px; padding-right: 12px; }
  .footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }
  @media print { body { margin: 0.5in; padding: 0; } @page { margin: 0.5in; } }
</style></head><body>
  <h1>Aeros PP Item Rate Calculator</h1>
  <div class="ref">Ref <strong>${escapeHtml(refLabel)}</strong> · ${today}</div>

  <div class="hero-label">Selling price / item</div>
  <div class="hero-price">₹${result.sellingPrice.toFixed(2)}</div>
  <div class="hero-sub">${result.profitPct}% margin over mfg · SP / case (${form.casePack || 0}): ₹${result.spPerCase.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</div>

  <h2>Item specifications</h2>
  <table class="spec">
    ${specRow("Item", form.itemName || "—")}
    ${specRow("Item weight", `${form.itemWeight} g`)}
    ${specRow("Cavities", `${form.itemsPerShot} per shot`)}
    ${specRow("Cycle time", `${form.cycleTime} s`)}
    ${specRow("RM rate", `₹${form.rmRate}/kg`)}
    ${specRow("Runner share", `${result.runnerSharePerItem} g / item (${form.runnerWeightPerShot} g per shot)`)}
    ${specRow("Regrind capture", `${form.regrindCapturePercent}%`)}
  </table>

  <h2>Throughput</h2>
  <table class="spec">
    ${specRow("Items / minute", result.itemsPerMin.toFixed(2))}
    ${specRow("Items / hour", result.itemsPerHr.toFixed(0))}
    ${specRow("Units / shift", result.unitsPerShift.toLocaleString("en-IN"))}
    ${specRow("Units / day", result.unitsPerDay.toLocaleString("en-IN"))}
  </table>

  <h2>Cost ladder (₹ / item)</h2>
  <table class="ladder">
    ${ladder.join("")}
  </table>

  <div class="footer">Generated ${today} · All prices are indicative estimates and subject to confirmation.</div>
  <script>window.onload = () => setTimeout(() => window.print(), 300);</script>
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) { alert("Popup blocked — please allow popups to export PDFs."); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
