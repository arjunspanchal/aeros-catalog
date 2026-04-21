"use client";
import { useMemo, useState } from "react";
import { Card, Field, Toggle, PillBtn, inputCls } from "@/app/calculator/_components/ui";
import {
  computeCupRateCurve,
  CUP_PRESETS,
  CUP_QTY_TIERS,
  SIZE_OPTS,
} from "@/lib/calc/cup-calculator";

const WALL_OPTS = [
  { val: "Single Wall", lbl: "Single Wall" },
  { val: "Double Wall", lbl: "Double Wall" },
  { val: "Ripple",      lbl: "Ripple" },
];

const COATING_OPTS = ["None", "PE", "2PE", "PLA", "Aqueous"];
const COVERAGE_OPTS = [10, 30, 100];

const DEFAULT_FORM = {
  wallType: "Double Wall",
  size: "8oz",
  td: "", bd: "", h: "",
  innerGsm: 280, innerCoating: "PE",
  outerGsm: 280, outerCoating: "PE",
  innerPrint: false, innerColours: 1, innerCoverage: 30,
  outerPrint: false, outerColours: 1, outerCoverage: 30,
  orderQty: 50000,
};

export default function ClientCupCalculator() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [result, setResult] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const num = (k, v) => set(k, parseFloat(v) || 0);

  const isDW = form.wallType === "Double Wall" || form.wallType === "Ripple";

  // Auto-fill dims from preset when size changes (DW Export has example dims).
  function pickSize(sz) {
    const next = { ...form, size: sz };
    const preset = CUP_PRESETS["DW Export"]?.codes?.[sz];
    if (preset?.td && !form.td) next.td = String(preset.td);
    if (preset?.bd && !form.bd) next.bd = String(preset.bd);
    if (preset?.h && !form.h) next.h = String(preset.h);
    setForm(next);
    setResult(null);
  }

  function calculate() {
    const curve = computeCupRateCurve({
      wallType: form.wallType,
      size: form.size,
      inner: {
        gsm: parseFloat(form.innerGsm) || 0,
        coating: form.innerCoating,
        print: form.innerPrint,
        colours: parseInt(form.innerColours) || 0,
        coverage: form.innerCoverage,
      },
      outer: isDW ? {
        gsm: parseFloat(form.outerGsm) || 0,
        coating: form.outerCoating,
        print: form.outerPrint,
        colours: parseInt(form.outerColours) || 0,
        coverage: form.outerCoverage,
      } : { gsm: 0, coating: "None", print: false, colours: 0, coverage: null },
    });
    setResult({ curve });
  }

  const selectedTier = useMemo(() => {
    if (!result?.curve) return null;
    return result.curve.find((c) => c.qty === form.orderQty) || result.curve[0];
  }, [result, form.orderQty]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <Card title="Cup size">
          <div className="flex gap-2 flex-wrap">
            {SIZE_OPTS.map((s) => (
              <PillBtn key={s} active={form.size === s} onClick={() => pickSize(s)}>{s}</PillBtn>
            ))}
          </div>
        </Card>

        <Card title="Dimensions (mm) — optional">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Top dia">
              <input type="number" className={inputCls} value={form.td} onChange={(e) => set("td", e.target.value)} placeholder="e.g. 80" />
            </Field>
            <Field label="Bottom dia">
              <input type="number" className={inputCls} value={form.bd} onChange={(e) => set("bd", e.target.value)} placeholder="e.g. 56" />
            </Field>
            <Field label="Height">
              <input type="number" className={inputCls} value={form.h} onChange={(e) => set("h", e.target.value)} placeholder="e.g. 93" />
            </Field>
          </div>
        </Card>

        <Card title="Wall type">
          <div className="flex gap-2 flex-wrap">
            {WALL_OPTS.map((w) => (
              <PillBtn key={w.val} active={form.wallType === w.val} onClick={() => set("wallType", w.val)}>{w.lbl}</PillBtn>
            ))}
          </div>
        </Card>

        <Card title="Inner wall">
          <div className="grid grid-cols-2 gap-3">
            <Field label="GSM">
              <input type="number" className={inputCls} value={form.innerGsm} onChange={(e) => num("innerGsm", e.target.value)} min="1" />
            </Field>
            <Field label="Coating">
              <select className={inputCls} value={form.innerCoating} onChange={(e) => set("innerCoating", e.target.value)}>
                {COATING_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <Toggle value={form.innerPrint} onChange={() => set("innerPrint", !form.innerPrint)} label="Inner printing" />
            {form.innerPrint && (
              <div className="mt-3 space-y-3">
                <Field label="No. of colours">
                  <input type="number" className={inputCls} value={form.innerColours} onChange={(e) => num("innerColours", e.target.value)} min="1" max="8" />
                </Field>
                <Field label="Ink coverage">
                  <div className="flex gap-2">
                    {COVERAGE_OPTS.map((c) => (
                      <PillBtn key={c} active={form.innerCoverage === c} onClick={() => set("innerCoverage", c)}>{c}%</PillBtn>
                    ))}
                  </div>
                </Field>
              </div>
            )}
          </div>
        </Card>

        {isDW && (
          <Card title="Outer wall">
            <div className="grid grid-cols-2 gap-3">
              <Field label="GSM">
                <input type="number" className={inputCls} value={form.outerGsm} onChange={(e) => num("outerGsm", e.target.value)} min="1" />
              </Field>
              <Field label="Coating">
                <select className={inputCls} value={form.outerCoating} onChange={(e) => set("outerCoating", e.target.value)}>
                  {COATING_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </Field>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <Toggle value={form.outerPrint} onChange={() => set("outerPrint", !form.outerPrint)} label="Outer printing" />
              {form.outerPrint && (
                <div className="mt-3 space-y-3">
                  <Field label="No. of colours">
                    <input type="number" className={inputCls} value={form.outerColours} onChange={(e) => num("outerColours", e.target.value)} min="1" max="8" />
                  </Field>
                  <Field label="Ink coverage">
                    <div className="flex gap-2">
                      {COVERAGE_OPTS.map((c) => (
                        <PillBtn key={c} active={form.outerCoverage === c} onClick={() => set("outerCoverage", c)}>{c}%</PillBtn>
                      ))}
                    </div>
                  </Field>
                </div>
              )}
            </div>
          </Card>
        )}

        <Card title="Order quantity">
          <Field label="Cups">
            <select className={inputCls} value={form.orderQty} onChange={(e) => set("orderQty", parseInt(e.target.value))}>
              {CUP_QTY_TIERS.map((q) => <option key={q} value={q}>{q.toLocaleString()}</option>)}
            </select>
          </Field>
        </Card>

        <button
          onClick={calculate}
          className="w-full bg-blue-600 text-white font-medium py-3 rounded-lg hover:bg-blue-700"
        >
          Calculate Rate
        </button>
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
            <div className="bg-gradient-to-br from-amber-600 to-orange-700 rounded-xl p-5 text-white shadow">
              <p className="text-amber-200 text-xs mb-1">
                Rate per cup @ {form.orderQty.toLocaleString()} — {form.size} {form.wallType}
              </p>
              <p className="text-4xl font-bold">₹{selectedTier.ratePerCup.toFixed(2)}</p>
              <p className="text-sm text-amber-100 mt-2">
                Case rate: ₹{selectedTier.ratePerCase.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                {" · "}Order total: ₹{selectedTier.orderTotal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </p>
            </div>

            <Card title="Rate curve by quantity">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase border-b border-gray-100 dark:border-gray-800">
                    <th className="text-left pb-2 font-medium">Order Qty</th>
                    <th className="text-right pb-2 font-medium">Rate / Cup</th>
                    <th className="text-right pb-2 font-medium">Rate / Case</th>
                    <th className="text-right pb-2 font-medium">Order Total</th>
                  </tr>
                </thead>
                <tbody>
                  {result.curve.map((c) => (
                    <tr key={c.qty} className={c.qty === form.orderQty ? "bg-amber-50 dark:bg-amber-900/20" : "border-b border-gray-50 dark:border-gray-800"}>
                      <td className="py-2 font-medium">{c.qty.toLocaleString()}</td>
                      <td className="py-2 text-right">₹{c.ratePerCup.toFixed(2)}</td>
                      <td className="py-2 text-right">₹{c.ratePerCase.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="py-2 text-right font-medium">₹{c.orderTotal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(form.innerPrint || form.outerPrint) && (
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
