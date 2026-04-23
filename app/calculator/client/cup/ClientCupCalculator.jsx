"use client";
import { useEffect, useMemo, useState } from "react";
import { Card, Field, Toggle, PillBtn, inputCls } from "@/app/calculator/_components/ui";
import { CUP_QTY_TIERS, SIZE_OPTS } from "@/lib/calc/cup-calculator";

const WALL_OPTS = [
  { val: "Single Wall", lbl: "Single Wall" },
  { val: "Double Wall", lbl: "Double Wall" },
  { val: "Ripple",      lbl: "Ripple" },
];

// Customer-facing inner coatings. The outer wall stays None and bottom is 2PE
// on standard products; both are baked in on the server.
const COATING_OPTS = ["None", "PE", "Aqueous", "PLA"];
const COVERAGE_OPTS = [10, 30, 100];
const INNER_GSM_OPTS = [240, 260, 280, 300, 320];
const OUTER_GSM_OPTS = [240, 260, 280, 300];

// Standard export pallet footprint and max stack height (mm).
const PALLET = { L: 1200, W: 1000, maxH: 1600 };

function parseDimsMm(str) {
  if (!str) return null;
  const parts = str.split(/[×x*]/).map((p) => parseFloat(p.trim().replace(/[^0-9.]/g, "")));
  if (parts.length < 3 || !parts.every((n) => n > 0)) return null;
  return { L: parts[0], W: parts[1], H: parts[2] };
}

function cartonMetrics(dims, totalBoxes) {
  if (!dims) return null;
  const { L, W, H } = dims;
  const cbm = (L * W * H) / 1_000_000_000;
  const perLayerA = Math.floor(PALLET.L / L) * Math.floor(PALLET.W / W);
  const perLayerB = Math.floor(PALLET.L / W) * Math.floor(PALLET.W / L);
  const perLayer = Math.max(perLayerA, perLayerB);
  const layers = Math.floor(PALLET.maxH / H);
  const boxesPerPallet = Math.max(0, perLayer * layers);
  return {
    cbm,
    boxesPerPallet,
    palletCount: boxesPerPallet > 0 ? Math.ceil(totalBoxes / boxesPerPallet) : 0,
  };
}

function downloadCsv(form, result) {
  const dims = parseDimsMm(result.product?.cartonDimensions);
  const totalCases = Math.ceil(form.orderQty / result.casePack);
  const m = cartonMetrics(dims, totalCases);
  const esc = (v) => {
    const s = String(v ?? "");
    return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = [
    ["Aeros Paper Cup Quote"],
    [],
    ["Wall type", form.wallType],
    ["Volume", form.size],
    ["SKU", form.sku || "—"],
    ["Inner wall GSM", form.innerGsm],
    ["Outer wall GSM", form.wallType === "Single Wall" ? "—" : form.outerGsm],
    ["Inner coating", form.coating],
    ["Printing", form.print ? `${form.colours} colour · ${form.coverage}% coverage` : "No printing"],
    ["Order quantity", form.orderQty],
    [],
    ["Box dimensions (mm)", result.product?.cartonDimensions || "—"],
    ["CBM per box", m ? m.cbm.toFixed(3) : "—"],
    ["Cases for order", totalCases],
    ["Boxes per pallet", m && m.boxesPerPallet > 0 ? m.boxesPerPallet : "—"],
    ["Pallets required", m && m.palletCount > 0 ? m.palletCount : "—"],
    [],
    ["One-time plate/die", result.oneTimeTotal || 0],
    [],
    ["Cost ladder"],
    ["Order Qty", "Rate / Cup", "Rate / Case", "Order Total"],
    ...result.curve.map((c) => [c.qty, c.ratePerCup.toFixed(2), c.ratePerCase.toFixed(2), c.orderTotal.toFixed(2)]),
  ];
  const csv = rows.map((r) => r.map(esc).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `aeros-cup-quote-${form.size}-${form.wallType.replace(/\s+/g, "")}-${form.orderQty}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const DEFAULT_FORM = {
  wallType: "Double Wall",
  size: "8oz",
  sku: "",               // selected product SKU; drives dims/box/casePack
  coating: "PE",
  innerGsm: 280,
  outerGsm: 280,
  print: false,
  colours: 1,
  coverage: 30,
  orderQty: 50000,
};

export default function ClientCupCalculator() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [productDims, setProductDims] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    let cancelled = false;
    fetch("/api/calc/cup-products")
      .then((r) => (r.ok ? r.json() : {}))
      .then((data) => { if (!cancelled && data && !data.error) setProductDims(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Sizes available in DB for the chosen wall type. Fallback to full set so
  // the user can always pick an oz bucket even before data loads.
  const availableSizes = useMemo(() => {
    const byWall = productDims[form.wallType];
    if (!byWall) return SIZE_OPTS;
    return SIZE_OPTS.filter((s) => Array.isArray(byWall[s]) && byWall[s].length > 0);
  }, [productDims, form.wallType]);

  // Variants (SKUs) available for the chosen wall + size.
  const variants = productDims[form.wallType]?.[form.size] || [];
  const selectedProduct = variants.find((v) => v.sku === form.sku) || null;

  // On wall/size change, reset sku to the first variant for that combo.
  useEffect(() => {
    const opts = productDims[form.wallType]?.[form.size] || [];
    if (opts.length === 0) { if (form.sku) setForm((f) => ({ ...f, sku: "" })); return; }
    const match = opts.find((v) => v.sku === form.sku);
    if (!match) setForm((f) => ({ ...f, sku: opts[0].sku }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productDims, form.wallType, form.size]);

  async function calculate() {
    setErr(""); setLoading(true);
    try {
      const res = await fetch("/api/calc/cup-rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallType: form.wallType,
          size: form.size,
          sku: form.sku,
          coating: form.coating,
          innerGsm: form.innerGsm,
          outerGsm: form.outerGsm,
          print: form.print,
          colours: form.colours,
          coverage: form.coverage,
          orderQty: form.orderQty,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErr(data.error || "Failed to calculate");
        setResult(null);
      } else {
        setResult(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }

  const selectedTier = useMemo(() => {
    if (!result?.curve) return null;
    return result.curve.find((c) => c.qty === form.orderQty) || result.curve[0];
  }, [result, form.orderQty]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <Card title="Wall type">
          <div className="flex gap-2 flex-wrap">
            {WALL_OPTS.map((w) => (
              <PillBtn
                key={w.val}
                active={form.wallType === w.val}
                onClick={() => { set("wallType", w.val); setResult(null); }}
              >
                {w.lbl}
              </PillBtn>
            ))}
          </div>
        </Card>

        <Card title="Volume">
          <div className="flex gap-2 flex-wrap">
            {SIZE_OPTS.map((s) => {
              const hasStock = !productDims[form.wallType] || availableSizes.includes(s);
              return (
                <PillBtn
                  key={s}
                  active={form.size === s}
                  onClick={() => { set("size", s); setResult(null); }}
                >
                  {s}{hasStock ? "" : " ·"}
                </PillBtn>
              );
            })}
          </div>
        </Card>

        {variants.length > 1 && (
          <Card title="Variant">
            <Field label="Pick the cup form" hint="Same volume, different dimensions">
              <select
                className={inputCls}
                value={form.sku}
                onChange={(e) => { set("sku", e.target.value); setResult(null); }}
              >
                {variants.map((v) => (
                  <option key={v.sku} value={v.sku}>
                    {v.variant} — {v.td}×{v.bd}×{v.h} mm · {v.sku}
                  </option>
                ))}
              </select>
            </Field>
          </Card>
        )}

        {selectedProduct && (
          <Card title="Specifications">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide dark:text-gray-500">Top dia</p>
                <p className="text-lg font-semibold text-gray-900 mt-1 dark:text-white">{selectedProduct.td} mm</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide dark:text-gray-500">Bottom dia</p>
                <p className="text-lg font-semibold text-gray-900 mt-1 dark:text-white">{selectedProduct.bd} mm</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide dark:text-gray-500">Height</p>
                <p className="text-lg font-semibold text-gray-900 mt-1 dark:text-white">{selectedProduct.h} mm</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 flex justify-between">
              <span>SKU · {selectedProduct.sku}</span>
              {selectedProduct.casePack && <span>{selectedProduct.casePack.toLocaleString()} cups / case</span>}
            </div>
          </Card>
        )}

        <Card title="Inner wall GSM">
          <div className="flex gap-2 flex-wrap">
            {INNER_GSM_OPTS.map((g) => (
              <PillBtn key={g} active={form.innerGsm === g} onClick={() => { set("innerGsm", g); setResult(null); }}>{g}</PillBtn>
            ))}
          </div>
        </Card>

        <Card title="Inner coating">
          <div className="flex gap-2 flex-wrap">
            {COATING_OPTS.map((c) => (
              <PillBtn key={c} active={form.coating === c} onClick={() => set("coating", c)}>{c}</PillBtn>
            ))}
          </div>
        </Card>

        {(form.wallType === "Double Wall" || form.wallType === "Ripple") && (
          <Card title="Outer wall GSM">
            <div className="flex gap-2 flex-wrap">
              {OUTER_GSM_OPTS.map((g) => (
                <PillBtn key={g} active={form.outerGsm === g} onClick={() => { set("outerGsm", g); setResult(null); }}>{g}</PillBtn>
              ))}
            </div>
          </Card>
        )}

        <Card title="Printing">
          <Toggle value={form.print} onChange={() => set("print", !form.print)} label="Printed" />
          {form.print && (
            <div className="mt-3 space-y-3 border-t border-gray-100 dark:border-gray-800 pt-3">
              <Field label="No. of colours">
                <input
                  type="number"
                  min="1"
                  max="8"
                  className={inputCls}
                  value={form.colours}
                  onChange={(e) => set("colours", parseInt(e.target.value) || 1)}
                />
              </Field>
              <Field label="Ink coverage">
                <div className="flex gap-2">
                  {COVERAGE_OPTS.map((c) => (
                    <PillBtn key={c} active={form.coverage === c} onClick={() => set("coverage", c)}>{c}%</PillBtn>
                  ))}
                </div>
              </Field>
            </div>
          )}
        </Card>

        <Card title="Order quantity">
          <Field label="Cups">
            <select className={inputCls} value={form.orderQty} onChange={(e) => set("orderQty", parseInt(e.target.value))}>
              {CUP_QTY_TIERS.map((q) => <option key={q} value={q}>{q.toLocaleString()}</option>)}
            </select>
          </Field>
        </Card>

        <button
          onClick={calculate}
          disabled={loading || !form.sku}
          className="w-full bg-blue-600 text-white font-medium py-3 rounded-lg hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Calculating…" : "Calculate Rate"}
        </button>
        {err && <p className="text-sm text-red-500 mt-2">{err}</p>}
        {!form.sku && <p className="text-xs text-gray-500 mt-2 dark:text-gray-400">No SKU in Products Master for this combination — contact sales.</p>}
      </div>

      <div className="lg:col-span-3 space-y-4">
        {!result && (
          <Card>
            <p className="text-sm text-gray-500 text-center py-10 dark:text-gray-400">
              Pick your cup specs on the left and click <strong>Calculate Rate</strong>.
            </p>
          </Card>
        )}

        {result && selectedTier && (
          <>
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-5 text-white shadow">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-blue-200 text-xs mb-0.5">Rate per cup @ {form.orderQty.toLocaleString()}</p>
                  <p className="text-2xl font-bold">₹{selectedTier.ratePerCup.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-blue-200 text-xs mb-0.5">Rate per case ({result.casePack} cups)</p>
                  <p className="text-2xl font-bold">₹{selectedTier.ratePerCase.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-blue-500">
                <p className="text-blue-200 text-xs mb-0.5">Order total — {form.orderQty.toLocaleString()} cups</p>
                <p className="text-2xl font-bold">₹{selectedTier.orderTotal.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
              </div>
            </div>

            {result.oneTimeTotal > 0 && (
              <Card title="One-time charges">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Plate / die setup (billed separately, once per artwork)
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    ₹{result.oneTimeTotal.toLocaleString("en-IN")}
                  </p>
                </div>
              </Card>
            )}

            {result.product?.cartonDimensions && (() => {
              const dims = parseDimsMm(result.product.cartonDimensions);
              const totalCases = Math.ceil(form.orderQty / result.casePack);
              const m = cartonMetrics(dims, totalCases);
              return (
                <Card title="Carton">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide dark:text-gray-500">Box dimensions (mm)</p>
                      <p className="text-lg font-semibold text-gray-900 mt-1 dark:text-white">{result.product.cartonDimensions}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide dark:text-gray-500">CBM per box</p>
                      <p className="text-lg font-semibold text-gray-900 mt-1 dark:text-white">
                        {m ? `${m.cbm.toFixed(3)} m³` : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide dark:text-gray-500">Cases for your order</p>
                      <p className="text-lg font-semibold text-gray-900 mt-1 dark:text-white">
                        {totalCases.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide dark:text-gray-500">Boxes per pallet</p>
                      <p className="text-lg font-semibold text-gray-900 mt-1 dark:text-white">
                        {m && m.boxesPerPallet > 0 ? `${m.boxesPerPallet} (≈${m.palletCount} pallets)` : "—"}
                      </p>
                    </div>
                  </div>
                  {m && m.boxesPerPallet > 0 && (
                    <p className="text-xs text-gray-400 mt-3 dark:text-gray-500">
                      Pallet footprint {PALLET.L}×{PALLET.W} mm · max stack height {PALLET.maxH} mm
                    </p>
                  )}
                </Card>
              );
            })()}

            <Card title="Cost ladder">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase border-b border-gray-100 dark:text-gray-500 dark:border-gray-800">
                    <th className="text-left pb-2 font-medium">Order Qty</th>
                    <th className="text-right pb-2 font-medium">Rate / Cup</th>
                    <th className="text-right pb-2 font-medium">Rate / Case</th>
                    <th className="text-right pb-2 font-medium">Order Total</th>
                  </tr>
                </thead>
                <tbody>
                  {result.curve.map((c) => (
                    <tr key={c.qty} className={c.qty === form.orderQty ? "bg-blue-50 dark:bg-blue-900/30" : "border-b border-gray-50 dark:border-gray-800"}>
                      <td className="py-2 font-medium dark:text-gray-200">{c.qty.toLocaleString()}</td>
                      <td className="py-2 text-right dark:text-gray-200">₹{c.ratePerCup.toFixed(2)}</td>
                      <td className="py-2 text-right dark:text-gray-200">₹{c.ratePerCase.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="py-2 text-right font-medium dark:text-gray-200">₹{c.orderTotal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {form.print && (
                <p className="text-xs text-gray-400 mt-3 dark:text-gray-500">
                  Rate drops at higher qty because plate cost is amortised over more cups.
                </p>
              )}
            </Card>

            <Card title="Export">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => downloadCsv(form, result)}
                  className="py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Download Excel (.csv)
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Download PDF
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-3 dark:text-gray-500">
                PDF uses the browser's Print → Save as PDF.
              </p>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
