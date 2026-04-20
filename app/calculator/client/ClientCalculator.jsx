"use client";
import { useState } from "react";
import { Card, Field, Toggle, PillBtn, inputCls } from "@/app/calculator/_components/ui";

export default function ClientCalculator() {
  const [form, setForm] = useState({
    bagType: "sos",
    width: 230, gusset: 125, height: 335,
    paperType: "Brown Kraft", gsm: 120, bf: "",
    casePack: 100,
    printing: false, colours: 1, coverage: 30,
    orderQty: 15000,
    quoteRef: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);
  const [err, setErr] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const num = (k, v) => set(k, parseFloat(v) || 0);

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <Card title="Bag Type">
          <div className="grid grid-cols-2 gap-2">
            {[["sos", "SOS"], ["rope_handle", "Rope Handle"], ["flat_handle", "Flat Handle"], ["v_bottom_gusset", "V-Bottom"]].map(([val, lbl]) => (
              <PillBtn key={val} active={form.bagType === val} onClick={() => set("bagType", val)}>{lbl}</PillBtn>
            ))}
          </div>
        </Card>

        <Card title="Dimensions (mm)">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Width"><input type="number" className={inputCls} value={form.width} onChange={(e) => num("width", e.target.value)} min="1" /></Field>
            <Field label="Gusset"><input type="number" className={inputCls} value={form.gusset} onChange={(e) => num("gusset", e.target.value)} min="0" /></Field>
            <Field label="Height"><input type="number" className={inputCls} value={form.height} onChange={(e) => num("height", e.target.value)} min="1" /></Field>
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
            <Field label="GSM"><input type="number" className={inputCls} value={form.gsm} onChange={(e) => num("gsm", e.target.value)} min="1" /></Field>
            <Field label="BF (Burst Factor)"><input type="number" className={inputCls} value={form.bf} onChange={(e) => set("bf", e.target.value)} min="0" step="0.5" placeholder="e.g. 28" /></Field>
          </div>
        </Card>

        <Card title="Packaging & Order">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Case Pack (bags/box)"><input type="number" className={inputCls} value={form.casePack} onChange={(e) => num("casePack", e.target.value)} min="1" /></Field>
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
                <input type="number" className={inputCls} value={form.colours} onChange={(e) => num("colours", e.target.value)} min="1" max="8" />
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
              <p className="text-blue-200 text-xs mb-1">Rate per bag @ {form.orderQty.toLocaleString()}</p>
              <p className="text-4xl font-bold">
                ₹{(result.curve.find((c) => c.qty === form.orderQty) || result.curve[0]).ratePerBag.toFixed(2)}
              </p>
              {result.result?.box && (
                <p className="text-blue-200 text-xs mt-3">
                  Approx box size: <span className="text-white font-medium">{result.result.box.L} × {result.result.box.W} × {result.result.box.D} mm</span> <span className="text-blue-300">({form.casePack} bags / case)</span>
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
                      <td className="py-2 text-right">₹{c.ratePerBag.toFixed(2)}</td>
                      <td className="py-2 text-right">₹{c.costPerCase.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="py-2 text-right font-medium">₹{c.orderTotal.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-gray-400 mt-3">
                Printed-bag rates drop at higher qty because plate cost is amortised over more units.
              </p>
            </Card>

            <Card title="Save this quote">
              <div className="flex gap-2">
                <input
                  className={inputCls}
                  placeholder="Quote reference (e.g. My PO #123)"
                  value={form.quoteRef}
                  onChange={(e) => set("quoteRef", e.target.value)}
                />
                <button
                  onClick={saveQuote}
                  className="shrink-0 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700"
                >Save</button>
              </div>
              {saveStatus === "success" && <p className="text-xs text-green-600 mt-2">✓ Saved to your quote history.</p>}
              {saveStatus === "error" && <p className="text-xs text-red-500 mt-2">Save failed. Try again.</p>}
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
