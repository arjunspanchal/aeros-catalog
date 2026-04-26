"use client";
import { useMemo, useState } from "react";
import { Card, Field, PillBtn, Row, SectionHeader, inputCls } from "@/app/calculator/_components/ui";
import { calculate, PP_PRESETS, PP_RM_GRADES, SIMPLE_MODEL_OVERRIDES } from "@/lib/calc/pp-calculator";

const DEFAULT_FORM = {
  preset: "custom",
  itemName: "",
  ...PP_PRESETS.custom,
  rmRate: 116,
};

export default function AdminPpCalculator() {
  const [form, setForm] = useState(DEFAULT_FORM);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const num = (k, v) => set(k, parseFloat(v) || 0);

  function applyPreset(key) {
    const p = PP_PRESETS[key];
    if (!p) return;
    setForm((f) => ({ ...f, ...p, preset: key, itemName: p.label, rmRate: f.rmRate }));
  }

  function applySimpleModel() {
    setForm((f) => ({ ...f, ...SIMPLE_MODEL_OVERRIDES }));
  }

  const result = useMemo(() => calculate(form), [form]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Left: inputs */}
      <div className="lg:col-span-2 space-y-4">
        <Card title="PP Item">
          <Field label="Preset">
            <select
              className={inputCls}
              value={form.preset}
              onChange={(e) => applyPreset(e.target.value)}
            >
              {Object.entries(PP_PRESETS).map(([k, p]) => (
                <option key={k} value={k}>{p.label}</option>
              ))}
            </select>
          </Field>
          <div className="mt-3">
            <Field label="Item Name (for quote ref)">
              <input
                type="text"
                className={inputCls}
                value={form.itemName}
                onChange={(e) => set("itemName", e.target.value)}
                placeholder="e.g. 600 mL PP Cup with Lid"
              />
            </Field>
          </div>
        </Card>

        <Card title="Raw Material">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Item Weight (g)">
              <input
                type="number"
                className={inputCls}
                value={form.itemWeight}
                onChange={(e) => num("itemWeight", e.target.value)}
                min="0"
                step="0.01"
              />
            </Field>
            <Field label="RM Rate (₹/kg)">
              <input
                type="number"
                className={inputCls}
                value={form.rmRate}
                onChange={(e) => num("rmRate", e.target.value)}
                min="0"
                step="0.5"
              />
            </Field>
          </div>
          <div className="flex gap-2 mt-3">
            {PP_RM_GRADES.map((g) => (
              <PillBtn
                key={g.key}
                active={form.rmRate === g.rate}
                onClick={() => set("rmRate", g.rate)}
              >
                {g.label}
              </PillBtn>
            ))}
          </div>
        </Card>

        <Card title="Sheet Yield & Regrind" right={
          <span className="text-xs text-gray-400 dark:text-gray-500">trim recovery</span>
        }>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sheet Yield (%)" hint="% of sheet that ends up as part">
              <input
                type="number"
                className={inputCls}
                value={form.yieldPercent}
                onChange={(e) => num("yieldPercent", e.target.value)}
                min="1"
                max="100"
                step="0.5"
              />
            </Field>
            <Field label="Regrind Capture (%)" hint="% of trim recovered as regrind">
              <input
                type="number"
                className={inputCls}
                value={form.regrindCapturePercent}
                onChange={(e) => num("regrindCapturePercent", e.target.value)}
                min="0"
                max="100"
                step="0.5"
              />
            </Field>
          </div>
          <p className="text-xs text-gray-400 mt-3 dark:text-gray-500">
            Sheet wt: {result.sheetWeight} g · Trim: {result.trimWeight} g · Regrind credit: ₹{result.regrindCredit.toFixed(4)}
          </p>
        </Card>

        <Card title="Forming">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cycle Time (sec)">
              <input
                type="number"
                className={inputCls}
                value={form.cycleTime}
                onChange={(e) => num("cycleTime", e.target.value)}
                min="0"
                step="0.1"
              />
            </Field>
            <Field label="Items per Shot">
              <input
                type="number"
                className={inputCls}
                value={form.itemsPerShot}
                onChange={(e) => num("itemsPerShot", e.target.value)}
                min="1"
                step="1"
              />
            </Field>
            <Field label="Shift Hours">
              <input
                type="number"
                className={inputCls}
                value={form.shiftHrs}
                onChange={(e) => num("shiftHrs", e.target.value)}
                min="0"
                step="0.5"
              />
            </Field>
            <Field label="Shifts per Day">
              <input
                type="number"
                className={inputCls}
                value={form.shiftsPerDay}
                onChange={(e) => num("shiftsPerDay", e.target.value)}
                min="1"
                step="1"
              />
            </Field>
            <Field label="Labour Cost / Day (₹)">
              <input
                type="number"
                className={inputCls}
                value={form.labourCostPerDay}
                onChange={(e) => num("labourCostPerDay", e.target.value)}
                min="0"
                step="100"
              />
            </Field>
          </div>
        </Card>

        <Card title="Electricity">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Machine Power (kW)" hint="Heaters + vacuum + chiller">
              <input
                type="number"
                className={inputCls}
                value={form.machinePowerKw}
                onChange={(e) => num("machinePowerKw", e.target.value)}
                min="0"
                step="1"
              />
            </Field>
            <Field label="Tariff (₹/kWh)">
              <input
                type="number"
                className={inputCls}
                value={form.electricityRate}
                onChange={(e) => num("electricityRate", e.target.value)}
                min="0"
                step="0.1"
              />
            </Field>
          </div>
        </Card>

        <Card title="Mold Amortisation">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mold Cost (₹)">
              <input
                type="number"
                className={inputCls}
                value={form.moldCost}
                onChange={(e) => num("moldCost", e.target.value)}
                min="0"
                step="1000"
              />
            </Field>
            <Field label="Mold Life (shots)" hint="× items-per-shot = total parts">
              <input
                type="number"
                className={inputCls}
                value={form.moldLifeShots}
                onChange={(e) => num("moldLifeShots", e.target.value)}
                min="1"
                step="10000"
              />
            </Field>
          </div>
        </Card>

        <Card title="Rejects">
          <Field label="Reject Rate (%)" hint="Uplifts forming costs to cover scrapped parts">
            <input
              type="number"
              className={inputCls}
              value={form.rejectPercent}
              onChange={(e) => num("rejectPercent", e.target.value)}
              min="0"
              max="50"
              step="0.5"
            />
          </Field>
        </Card>

        <Card title="Packing">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Inner Sleeve Cost (₹)">
              <input
                type="number"
                className={inputCls}
                value={form.innerSleeveCost}
                onChange={(e) => num("innerSleeveCost", e.target.value)}
                min="0"
                step="0.05"
              />
            </Field>
            <Field label="Inner Packing Labour (₹)">
              <input
                type="number"
                className={inputCls}
                value={form.innerPackingLabour}
                onChange={(e) => num("innerPackingLabour", e.target.value)}
                min="0"
                step="0.05"
              />
            </Field>
            <Field label="Units per Sleeve">
              <input
                type="number"
                className={inputCls}
                value={form.unitsPerSleeve}
                onChange={(e) => num("unitsPerSleeve", e.target.value)}
                min="1"
                step="1"
              />
            </Field>
            <Field label="Carton Cost (₹)">
              <input
                type="number"
                className={inputCls}
                value={form.cartonCost}
                onChange={(e) => num("cartonCost", e.target.value)}
                min="0"
                step="1"
              />
            </Field>
            <Field label="Case Pack (units/carton)">
              <input
                type="number"
                className={inputCls}
                value={form.casePack}
                onChange={(e) => num("casePack", e.target.value)}
                min="1"
                step="50"
              />
            </Field>
          </div>
        </Card>

        <Card title="Margin">
          <Field label="Profit %">
            <input
              type="number"
              className={inputCls}
              value={form.profitPercent}
              onChange={(e) => num("profitPercent", e.target.value)}
              min="0"
              step="0.5"
            />
          </Field>
          <button
            type="button"
            onClick={applySimpleModel}
            className="mt-3 w-full text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline"
          >
            Switch to simple model (zero out yield, electricity, mold, reject)
          </button>
        </Card>
      </div>

      {/* Right: results */}
      <div className="lg:col-span-3 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-5 text-white shadow">
            <p className="text-blue-100 text-xs mb-1">Selling Price / item</p>
            <p className="text-3xl font-bold">₹{result.sellingPrice.toFixed(2)}</p>
            <p className="text-xs text-blue-100 mt-2">{result.profitPct}% margin over mfg</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 dark:bg-gray-900 dark:border-gray-800">
            <p className="text-xs text-gray-400 mb-1">SP / Case ({form.casePack || 0})</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              ₹{result.spPerCase.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-500 mt-2 dark:text-gray-400">
              Mfg: ₹{result.totalMfg.toFixed(4)} · Profit: ₹{result.profit.toFixed(4)}
            </p>
          </div>
        </div>

        <Card title="Throughput">
          <table className="w-full">
            <tbody>
              <Row label="Items / minute" value={result.itemsPerMin.toFixed(2)} />
              <Row label="Items / hour" value={result.itemsPerHr.toFixed(0)} />
              <Row label="Units / shift" value={result.unitsPerShift.toLocaleString("en-IN")} />
              <Row label="Units / day" value={result.unitsPerDay.toLocaleString("en-IN")} />
            </tbody>
          </table>
        </Card>

        <Card title="Cost breakdown (₹ / item)">
          <table className="w-full">
            <tbody>
              <SectionHeader label="Raw Material" />
              <Row
                label="Sheet RM (gross)"
                value={`₹${result.sheetRmCost.toFixed(4)}`}
                sub={`${result.sheetWeight} g × ₹${form.rmRate}/kg @ ${form.yieldPercent}% yield`}
              />
              {result.regrindCredit > 0 && (
                <Row
                  label={`− Regrind credit (${form.regrindCapturePercent}% of trim)`}
                  value={`−₹${result.regrindCredit.toFixed(4)}`}
                  sub={`${result.regrindWeight} g recovered`}
                />
              )}
              <Row label="Net RM" value={`₹${result.rmCost.toFixed(4)}`} />

              <SectionHeader label="Forming" />
              <Row
                label="Labour / item"
                value={`₹${result.labourCostPerItem.toFixed(4)}`}
                sub={`₹${form.labourCostPerDay.toLocaleString("en-IN")} / ${result.unitsPerDay.toLocaleString("en-IN")} units/day`}
              />
              {result.electricityCostPerItem > 0 && (
                <Row
                  label="Electricity"
                  value={`₹${result.electricityCostPerItem.toFixed(4)}`}
                  sub={`${form.machinePowerKw} kW × ₹${form.electricityRate}/kWh ÷ ${result.itemsPerHr.toFixed(0)} items/hr`}
                />
              )}
              {result.moldCostPerItem > 0 && (
                <Row
                  label="Mold amortisation"
                  value={`₹${result.moldCostPerItem.toFixed(4)}`}
                  sub={`₹${form.moldCost.toLocaleString("en-IN")} / (${form.moldLifeShots.toLocaleString("en-IN")} shots × ${form.itemsPerShot})`}
                />
              )}
              {result.rejectUplift > 0 && (
                <Row
                  label={`Reject uplift (${form.rejectPercent}%)`}
                  value={`₹${result.rejectUplift.toFixed(4)}`}
                  sub={`× ${result.rejectFactor.toFixed(4)} on RM + forming`}
                />
              )}
              <Row label="Per-part subtotal" value={`₹${result.formedCost.toFixed(4)}`} />

              <SectionHeader label="Packing" />
              <Row
                label="Inner packing"
                value={`₹${result.innerPackCostPerItem.toFixed(4)}`}
                sub={`(₹${form.innerSleeveCost} sleeve + ₹${form.innerPackingLabour} labour) / ${form.unitsPerSleeve} per sleeve`}
              />
              <Row
                label="Carton"
                value={`₹${result.cartonCostPerItem.toFixed(4)}`}
                sub={`₹${form.cartonCost} / ${form.casePack} per case`}
              />
              <Row label="Total packing" value={`₹${result.totalPackingCost.toFixed(4)}`} />

              <SectionHeader label="Totals" />
              <Row label="Manufacturing cost" value={`₹${result.totalMfg.toFixed(4)}`} />
              <Row label={`Profit (${result.profitPct}%)`} value={`₹${result.profit.toFixed(4)}`} />
              <Row label="Selling price" value={`₹${result.sellingPrice.toFixed(4)}`} highlight />
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
