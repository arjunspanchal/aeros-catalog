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

const DEFAULT_FORM = {
  wallType: "Double Wall",
  size: "8oz",
  sku: "",               // selected product SKU; drives dims/box/casePack
  coating: "PE",
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

        <Card title="Inner coating">
          <div className="flex gap-2 flex-wrap">
            {COATING_OPTS.map((c) => (
              <PillBtn key={c} active={form.coating === c} onClick={() => set("coating", c)}>{c}</PillBtn>
            ))}
          </div>
        </Card>

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

            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-5 text-white shadow flex flex-wrap gap-6">
              <div>
                <p className="text-red-200 text-xs">Manufacturing cost</p>
                <p className="text-2xl font-bold">₹{selectedTier.mfgPerCup.toFixed(4)}</p>
              </div>
              <div className="border-l border-red-400 pl-6">
                <p className="text-red-200 text-xs">Margin ({result.marginPct}%)</p>
                <p className="text-2xl font-bold">₹{selectedTier.marginAmt.toFixed(4)}</p>
              </div>
              {result.oneTimeTotal > 0 && (
                <div className="border-l border-red-400 pl-6">
                  <p className="text-red-200 text-xs">Plate / die (one-time)</p>
                  <p className="text-2xl font-bold">₹{result.oneTimeTotal.toLocaleString("en-IN")}</p>
                </div>
              )}
            </div>

            {result.product?.cartonDimensions && (
              <Card title="Carton">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide dark:text-gray-500">Box dimensions (mm)</p>
                    <p className="text-lg font-semibold text-gray-900 mt-1 dark:text-white">{result.product.cartonDimensions}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 uppercase tracking-wide dark:text-gray-500">Cases for your order</p>
                    <p className="text-lg font-semibold text-gray-900 mt-1 dark:text-white">
                      {Math.ceil(form.orderQty / result.casePack).toLocaleString()}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            <Card title="Rate curve by quantity">
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
          </>
        )}
      </div>
    </div>
  );
}
