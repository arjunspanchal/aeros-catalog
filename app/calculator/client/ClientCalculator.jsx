"use client";
import { useEffect, useState } from "react";
import { Card, Field, Toggle, PillBtn, inputCls } from "@/app/calculator/_components/ui";
import { CURRENCIES, CURRENCY_CODES, formatCurrency } from "@/lib/calc/calculator";

const GSM_OPTIONS = [60, 70, 80, 90, 100, 110, 120, 130, 140];
const BF_OPTIONS = [16, 18, 20, 22, 24, 26, 28];
const COLOUR_OPTIONS = [1, 2, 3, 4];

// mm <-> inches helpers. Internal form state is always mm (because the calculator
// engine works in mm); we convert only for display and when reading user input.
const MM_PER_INCH = 25.4;
const toInches = (mm) => (mm ? +(mm / MM_PER_INCH).toFixed(2) : 0);
const fromInches = (inches) => (inches ? Math.round(inches * MM_PER_INCH) : 0);

export default function ClientCalculator() {
  const [form, setForm] = useState({
    bagType: "sos",
    width: 230, gusset: 125, height: 335,
    paperType: "Brown Kraft", gsm: 120, bf: 28,
    casePack: 100,
    printing: false, colours: 1, coverage: 30,
    orderQty: 15000,
    brand: "",
    quoteRef: "",
  });
  const [currency, setCurrency] = useState("INR");
  const [unit, setUnit] = useState("mm");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/calc/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.preferredCurrency) setCurrency(data.preferredCurrency);
        if (data?.preferredUnit) setUnit(data.preferredUnit);
      })
      .catch(() => {});
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const num = (k, v) => set(k, parseFloat(v) || 0);

  // Stores incoming user input (maybe inches) in the form state as mm.
  const setDim = (k, v) => {
    const n = parseFloat(v) || 0;
    set(k, unit === "in" ? fromInches(n) : Math.round(n));
  };
  const showDim = (mm) => (unit === "in" ? toInches(mm) : mm);

  async function updatePrefs(updates) {
    if (updates.preferredCurrency) setCurrency(updates.preferredCurrency);
    if (updates.preferredUnit) setUnit(updates.preferredUnit);
    try {
      await fetch("/api/calc/client/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
    } catch {}
  }

  async function calculate() {
    setErr(""); setSaveStatus(null); setLoading(true);
    try {
      const res = await fetch("/api/calc/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErr(data.error || "Failed to calculate"); setResult(null);
      } else {
        setResult(await res.json());
      }
    } finally { setLoading(false); }
  }

  async function saveQuote() {
    if (!result) return;
    setSaveStatus(null);
    const tier = result.curve.find((c) => c.qty === form.orderQty) || result.curve[0];
    const res = await fetch("/api/calc/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quoteRef: form.quoteRef || `Q ${new Date().toISOString().split("T")[0]}`,
        bagType: form.bagType,
        brand: form.brand || undefined,
        width: form.width, gusset: form.gusset, height: form.height,
        paperType: form.paperType, gsm: form.gsm, bf: form.bf,
        casePack: form.casePack, orderQty: form.orderQty,
        printing: form.printing, colours: form.colours, coverage: form.coverage,
        sellingPrice: tier.ratePerBag,
        costPerCase: tier.costPerCase,
        orderTotal: tier.orderTotal,
      }),
    });
    setSaveStatus(res.ok ? "success" : "error");
  }

  const tier = result?.curve?.find((c) => c.qty === form.orderQty) || result?.curve?.[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <Card title="Preferences">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Currency">
              <select className={inputCls} value={currency} onChange={(e) => updatePrefs({ preferredCurrency: e.target.value })}>
                {CURRENCY_CODES.map((c) => (
                  <option key={c} value={c}>{c} ({CURRENCIES[c].symbol})</option>
                ))}
              </select>
            </Field>
            <Field label="Dimension Units">
              <div className="flex gap-2">
                <PillBtn active={unit === "mm"} onClick={() => updatePrefs({ preferredUnit: "mm" })}>mm</PillBtn>
                <PillBtn active={unit === "in"} onClick={() => updatePrefs({ preferredUnit: "in" })}>inches</PillBtn>
              </div>
            </Field>
          </div>
          <p className="text-xs text-gray-400 mt-2">Saved to your profile. Rates shown in {currency}; bag sizes entered in {unit === "in" ? "inches" : "millimetres"}.</p>
        </Card>

        <Card title="Bag Type">
          <div className="grid grid-cols-2 gap-2">
            {[["sos", "SOS"], ["rope_handle", "Rope Handle"], ["flat_handle", "Flat Handle"], ["v_bottom_gusset", "V-Bottom"]].map(([val, lbl]) => (
              <PillBtn key={val} active={form.bagType === val} onClick={() => set("bagType", val)}>{lbl}</PillBtn>
            ))}
          </div>
        </Card>

        <Card title={`Dimensions (${unit === "in" ? "inches" : "mm"})`}>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Width">
              <input type="number" step={unit === "in" ? "0.1" : "1"} className={inputCls}
                value={showDim(form.width)} onChange={(e) => setDim("width", e.target.value)} min="0" />
            </Field>
            <Field label="Gusset">
              <input type="number" step={unit === "in" ? "0.1" : "1"} className={inputCls}
                value={showDim(form.gusset)} onChange={(e) => setDim("gusset", e.target.value)} min="0" />
            </Field>
            <Field label="Height">
              <input type="number" step={unit === "in" ? "0.1" : "1"} className={inputCls}
                value={showDim(form.height)} onChange={(e) => setDim("height", e.target.value)} min="0" />
            </Field>
          </div>
        </Card>

        <Card title="Paper">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <select className={inputCls} value={form.paperType} onChange={(e) => set("paperType", e.target.value)}>
                <option value="Brown Kraft">Brown Kraft</option>
                <option value="Bleach Kraft White">Bleach Kraft White</option>
                <option value="OGR">OGR</option>
              </select>
            </Field>
            <Field label="GSM">
              <select className={inputCls} value={form.gsm} onChange={(e) => set("gsm", parseInt(e.target.value))}>
                {GSM_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="BF (Burst Factor)">
              <select className={inputCls} value={form.bf} onChange={(e) => set("bf", parseInt(e.target.value))}>
                {BF_OPTIONS.map((b) => <option key={b} value={b}>{b} BF</option>)}
              </select>
            </Field>
          </div>
        </Card>

        <Card title="Packaging & Order">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Case Pack (bags/box)">
              <input type="number" className={inputCls} value={form.casePack} onChange={(e) => num("casePack", e.target.value)} min="1" />
            </Field>
            <Field label="Order Quantity">
              <select className={inputCls} value={form.orderQty} onChange={(e) => set("orderQty", parseInt(e.target.value))}>
                <option value={15000}>15,000</option>
                <option value={30000}>30,000</option>
                <option value={50000}>50,000</option>
                <option value={100000}>100,000</option>
                <option value={250000}>250,000</option>
              </select>
            </Field>
          </div>
        </Card>

        <Card title="Printing">
          <Toggle value={form.printing} onChange={() => set("printing", !form.printing)} label="Printing Required" />
          {form.printing && (
            <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
              <Field label="No. of Colours">
                <div className="flex gap-2">
                  {COLOUR_OPTIONS.map((c) => (
                    <PillBtn key={c} active={form.colours === c} onClick={() => set("colours", c)}>{c}</PillBtn>
                  ))}
                </div>
              </Field>
              <Field label="Ink Coverage">
                <div className="flex gap-2">
                  {[[10, "10%"], [30, "30%"], [100, "100%"]].map(([val, lbl]) => (
                    <PillBtn key={val} active={form.coverage === val} onClick={() => set("coverage", val)}>{lbl}</PillBtn>
                  ))}
                </div>
              </Field>
            </div>
          )}
        </Card>

        <button
          onClick={calculate}
          disabled={loading}
          className="w-full bg-blue-600 text-white font-medium py-3 rounded-lg hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Calculating…" : "Calculate Rate"}
        </button>
        {err && <p className="text-sm text-red-500">{err}</p>}
      </div>

      <div className="lg:col-span-3 space-y-4">
        {!result && (
          <Card>
            <p className="text-sm text-gray-500 text-center py-10">
              Enter your bag specs on the left and click <strong>Calculate Rate</strong>.
            </p>
          </Card>
        )}
        {result && (
          <>
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-5 text-white shadow">
              <p className="text-blue-200 text-xs mb-1">Rate per bag @ {form.orderQty.toLocaleString()} ({currency})</p>
              <p className="text-4xl font-bold">{formatCurrency(tier.ratePerBag, currency)}</p>
              {result.result?.box && (
                <p className="text-blue-200 text-xs mt-3">
                  Approx box size:{" "}
                  <span className="text-white font-medium">
                    {unit === "in"
                      ? `${toInches(result.result.box.L)} × ${toInches(result.result.box.W)} × ${toInches(result.result.box.D)} in`
                      : `${result.result.box.L} × ${result.result.box.W} × ${result.result.box.D} mm`}
                  </span>{" "}
                  <span className="text-blue-300">({form.casePack} bags / case)</span>
                </p>
              )}
            </div>

            <Card title="Rate curve by quantity">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                    <th className="text-left pb-2 font-medium">Order Qty</th>
                    <th className="text-right pb-2 font-medium">Rate / Bag</th>
                    <th className="text-right pb-2 font-medium">Cost / Case</th>
                    <th className="text-right pb-2 font-medium">Order Total</th>
                  </tr>
                </thead>
                <tbody>
                  {result.curve.map((c) => (
                    <tr key={c.qty} className={c.qty === form.orderQty ? "bg-blue-50" : "border-b border-gray-50"}>
                      <td className="py-2 font-medium">{c.qty.toLocaleString()}</td>
                      <td className="py-2 text-right">{formatCurrency(c.ratePerBag, currency)}</td>
                      <td className="py-2 text-right">{formatCurrency(c.costPerCase, currency)}</td>
                      <td className="py-2 text-right font-medium">{formatCurrency(c.orderTotal, currency, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-gray-400 mt-3">Printed-bag rates drop at higher qty because plate cost is amortised over more units.</p>
            </Card>

            <Card title="Save this quote">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <Field label="Brand">
                  <input className={inputCls} placeholder="e.g. Zepto, Swiggy, Zomato"
                    value={form.brand} onChange={(e) => set("brand", e.target.value)} />
                </Field>
                <Field label="Quote reference">
                  <input className={inputCls} placeholder="e.g. PO #123"
                    value={form.quoteRef} onChange={(e) => set("quoteRef", e.target.value)} />
                </Field>
              </div>
              <button onClick={saveQuote}
                className="w-full bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700">
                Save quote
              </button>
              {saveStatus === "success" && <p className="text-xs text-green-600 mt-2">✓ Saved to your quote history.</p>}
              {saveStatus === "error" && <p className="text-xs text-red-500 mt-2">Save failed. Try again.</p>}
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
