"use client";
import { useMemo, useState } from "react";
import { Card, Field, inputCls, PillBtn, Toggle } from "@/app/calculator/_components/ui";
import {
  CONTAINERS,
  PALLETS,
  getContainer,
  getPallet,
  calcMixedLoad,
  calcLCL,
  toMM,
} from "@/lib/factoryos/container-stuffing";
import { PalletDiagram, FloorDiagram } from "./StuffingDiagram";
import { exportStuffingCSV, exportStuffingPDF } from "./export";

const fmt = (n, d = 0) =>
  Number.isFinite(n)
    ? n.toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d })
    : "—";

let _rid = 0;
const rid = () => `r${++_rid}`;
const blankRow = () => ({ id: rid(), name: "", L: "", W: "", H: "", qty: "", kg: "" });

export default function ContainerStuffingCalc() {
  const [mode, setMode] = useState("floor");
  const [containerId, setContainerId] = useState("40ft_hc");
  const [palletId, setPalletId] = useState("euro");
  const [maxLoadHeight, setMaxLoadHeight] = useState("");
  const [unit, setUnit] = useState("cm");
  const [keepUpright, setKeepUpright] = useState(false);
  const [rows, setRows] = useState([blankRow()]);
  const [lclRate, setLclRate] = useState("");

  const updateRow = (id, patch) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const removeRow = (id) =>
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.id !== id) : rs));
  const addRow = () => setRows((rs) => [...rs, blankRow()]);

  const result = useMemo(() => {
    const items = rows.map((r) => ({
      name: r.name,
      L: toMM(r.L, unit),
      W: toMM(r.W, unit),
      H: toMM(r.H, unit),
      qty: Number(r.qty) || 0,
      kg: Number(r.kg) || 0,
    }));
    if (mode === "lcl") {
      return calcLCL({ items, ratePerWM: Number(lclRate) || 0 });
    }
    return calcMixedLoad({
      container: getContainer(containerId),
      mode,
      pallet: getPallet(palletId),
      maxLoadHeight: Number(maxLoadHeight) || 0,
      keepUpright,
      items,
    });
  }, [rows, unit, mode, containerId, palletId, maxLoadHeight, keepUpright, lclRate]);

  const container = getContainer(containerId);
  const pallet = getPallet(palletId);
  const hasAnyDims = rows.some((r) => r.L && r.W && r.H);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Inputs">
        <div className="space-y-4">
          <Field label="Shipment mode" hint="FCL Floor / FCL Pallet = full container. LCL = sea freight by chargeable W/M (greater of CBM or metric tons).">
            <div className="flex gap-2">
              <PillBtn active={mode === "floor"} onClick={() => setMode("floor")}>FCL Floor</PillBtn>
              <PillBtn active={mode === "pallet"} onClick={() => setMode("pallet")}>FCL Pallet</PillBtn>
              <PillBtn active={mode === "lcl"} onClick={() => setMode("lcl")}>LCL</PillBtn>
            </div>
          </Field>

          {mode !== "lcl" && (
            <Field label="Container">
              <select className={inputCls} value={containerId} onChange={(e) => setContainerId(e.target.value)}>
                {CONTAINERS.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1 dark:text-gray-500">
                Interior {fmt(container.L)} × {fmt(container.W)} × {fmt(container.H)} mm · max payload {fmt(container.maxPayloadKg)} kg
              </p>
            </Field>
          )}

          {mode === "lcl" && (
            <Field label="Rate per W/M (₹)" hint="Optional. Multiplied by chargeable W/M (the greater of CBM or metric tons).">
              <input
                type="number"
                inputMode="decimal"
                className={inputCls}
                value={lclRate}
                onChange={(e) => setLclRate(e.target.value)}
                placeholder="0"
              />
            </Field>
          )}

          {mode === "pallet" && (
            <>
              <Field label="Pallet">
                <select className={inputCls} value={palletId} onChange={(e) => setPalletId(e.target.value)}>
                  {PALLETS.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1 dark:text-gray-500">
                  {fmt(pallet.L)} × {fmt(pallet.W)} × {fmt(pallet.H)} mm · {fmt(pallet.weightKg)} kg
                </p>
              </Field>
              <Field label="Max load height (mm)" hint="Pallet + carton stack. Leave blank to use container interior height.">
                <input
                  type="number"
                  inputMode="numeric"
                  className={inputCls}
                  value={maxLoadHeight}
                  onChange={(e) => setMaxLoadHeight(e.target.value)}
                  placeholder={String(container.H)}
                />
              </Field>
            </>
          )}

          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Items in this container</h3>
            <div className="flex gap-2">
              {["mm", "cm", "in", "m"].map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnit(u)}
                  className={`px-2 py-1 text-xs rounded-md border ${
                    unit === u
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700"
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {rows.map((r, i) => (
              <div key={r.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <input
                    type="text"
                    placeholder={`Item ${i + 1} name (optional)`}
                    className="flex-1 bg-transparent text-sm font-medium text-gray-800 dark:text-gray-100 focus:outline-none"
                    value={r.name}
                    onChange={(e) => updateRow(r.id, { name: e.target.value })}
                  />
                  {rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow(r.id)}
                      className="text-xs text-red-600 hover:underline ml-2 dark:text-red-400"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <input type="number" inputMode="decimal" placeholder={`L (${unit})`} className={inputCls} value={r.L} onChange={(e) => updateRow(r.id, { L: e.target.value })} />
                  <input type="number" inputMode="decimal" placeholder={`W (${unit})`} className={inputCls} value={r.W} onChange={(e) => updateRow(r.id, { W: e.target.value })} />
                  <input type="number" inputMode="decimal" placeholder={`H (${unit})`} className={inputCls} value={r.H} onChange={(e) => updateRow(r.id, { H: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" inputMode="numeric" placeholder="Cartons (qty)" className={inputCls} value={r.qty} onChange={(e) => updateRow(r.id, { qty: e.target.value })} />
                  <input type="number" inputMode="decimal" placeholder="Carton weight (kg)" className={inputCls} value={r.kg} onChange={(e) => updateRow(r.id, { kg: e.target.value })} />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addRow}
              className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              + Add another item
            </button>
          </div>

          <Toggle
            value={keepUpright}
            onChange={() => setKeepUpright((v) => !v)}
            label="Keep upright"
            sub="(only allow rotating L↔W)"
          />
        </div>
      </Card>

      <Card
        title="Result"
        right={
          hasAnyDims && !(result.errors && result.errors.length) ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => exportStuffingPDF({ result, mode, container, pallet, ratePerWM: Number(lclRate) || 0 })}
                className="text-xs font-medium px-2.5 py-1 rounded-md border border-gray-200 hover:border-gray-300 text-gray-700 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-200"
              >
                Export PDF
              </button>
              <button
                type="button"
                onClick={() => exportStuffingCSV({ result, mode, container, pallet, ratePerWM: Number(lclRate) || 0 })}
                className="text-xs font-medium px-2.5 py-1 rounded-md border border-gray-200 hover:border-gray-300 text-gray-700 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-200"
              >
                Export Excel
              </button>
            </div>
          ) : null
        }
      >
        {!hasAnyDims ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Enter dimensions for at least one item.</p>
        ) : result.errors && result.errors.length ? (
          <ul className="text-sm text-red-600 dark:text-red-400 list-disc pl-5">
            {result.errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        ) : result.mode === "lcl" ? (
          <LCLBody result={result} />
        ) : (
          <ResultBody result={result} container={container} pallet={pallet} />
        )}
      </Card>
    </div>
  );
}

function ResultBody({ result, container, pallet }) {
  const t = result.totals;
  const isPallet = result.mode === "pallet";
  const noQty = t.totalCBM === 0;

  return (
    <div className="space-y-4">
      <div className={`rounded-lg p-3 border ${
        noQty
          ? "bg-gray-50 border-gray-200 dark:bg-gray-800/40 dark:border-gray-700"
          : t.fits
          ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800"
          : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
      }`}>
        <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          {noQty
            ? "Enter quantities to plan a load"
            : t.fits
            ? "Fits in container"
            : `Exceeds ${t.exceeds.join(" + ")}`}
        </div>
        {!noQty && (
          <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Volume</div>
              <div className="font-semibold text-gray-800 dark:text-gray-100">
                {fmt(t.totalCBM, 2)} / {fmt(result.containerCBM, 2)} CBM
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{fmt(t.cbmPct, 1)} %</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Weight</div>
              <div className="font-semibold text-gray-800 dark:text-gray-100">
                {fmt(t.totalKg, 1)} / {fmt(container.maxPayloadKg)} kg
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{fmt(t.weightPct, 1)} %</div>
            </div>
            {isPallet && t.palletFloorCapacity > 0 && (
              <div className="col-span-2">
                <div className="text-xs text-gray-500 dark:text-gray-400">Pallets needed</div>
                <div className="font-semibold text-gray-800 dark:text-gray-100">
                  {fmt(t.totalPalletsNeeded)} / {fmt(t.palletFloorCapacity)} floor positions
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{fmt(t.palletPct, 1)} %</div>
              </div>
            )}
          </div>
        )}
      </div>

      <table className="w-full text-sm">
        <thead className="text-xs text-gray-500 uppercase dark:text-gray-400">
          <tr>
            <th className="text-left py-2 px-2 font-medium">Item</th>
            <th className="text-right py-2 px-2 font-medium">Qty</th>
            <th className="text-right py-2 px-2 font-medium">CBM</th>
            <th className="text-right py-2 px-2 font-medium">Max alone</th>
            {isPallet && <th className="text-right py-2 px-2 font-medium">Pallets</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {result.items.map((it, i) => (
            <tr key={i}>
              <td className="py-2 px-2 text-gray-800 dark:text-gray-100">
                {it.name || `Item ${i + 1}`}
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {fmt(it.L)} × {fmt(it.W)} × {fmt(it.H)} mm
                </div>
              </td>
              <td className="py-2 px-2 text-right text-gray-800 dark:text-gray-100">
                {fmt(it.qty)}
              </td>
              <td className="py-2 px-2 text-right text-gray-800 dark:text-gray-100">
                {fmt(it.usedCBM, 2)}
              </td>
              <td className="py-2 px-2 text-right text-gray-500 dark:text-gray-400">
                {fmt(it.maxAlone)}
              </td>
              {isPallet && (
                <td className="py-2 px-2 text-right text-gray-800 dark:text-gray-100">
                  {it.palletInfo ? (
                    <>
                      {fmt(it.palletInfo.palletsNeeded)}
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {fmt(it.palletInfo.cartonsPerPallet)} / pallet
                      </div>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-400 dark:text-gray-500">
        &ldquo;Max alone&rdquo; = how many of just this item would fit if it were the only SKU in the container. Useful as a per-item ceiling.
      </p>

      {!noQty && (
        <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
            Stuffing diagram (top-down)
          </h4>
          {isPallet && result.palletPlacements ? (
            <PalletDiagram
              container={container}
              items={result.items}
              placements={result.palletPlacements}
              palletGrid={result.palletGrid}
            />
          ) : !isPallet ? (
            <FloorDiagram container={container} items={result.items} />
          ) : null}
        </div>
      )}
    </div>
  );
}

function LCLBody({ result }) {
  const t = result.totals;
  const noQty = t.totalCBM === 0;

  return (
    <div className="space-y-4">
      <div className="rounded-lg p-3 border bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
        <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          {noQty ? "Enter quantities to compute LCL chargeable W/M" : `LCL · charged on ${t.basis}`}
        </div>
        {!noQty && (
          <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Total volume</div>
              <div className="font-semibold text-gray-800 dark:text-gray-100">{fmt(t.totalCBM, 3)} CBM</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Total weight</div>
              <div className="font-semibold text-gray-800 dark:text-gray-100">
                {fmt(t.totalKg, 1)} kg ({fmt(t.tonnes, 3)} t)
              </div>
            </div>
            <div className="col-span-2">
              <div className="text-xs text-gray-500 dark:text-gray-400">Chargeable W/M</div>
              <div className="font-semibold text-gray-800 dark:text-gray-100">
                {fmt(t.chargeableWM, 3)} {t.basis === "volume" ? "CBM" : "t"}
              </div>
              {t.ratePerWM > 0 && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Freight estimate: ₹{fmt(t.freight, 0)} ({fmt(t.chargeableWM, 3)} × ₹{fmt(t.ratePerWM, 0)})
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <table className="w-full text-sm">
        <thead className="text-xs text-gray-500 uppercase dark:text-gray-400">
          <tr>
            <th className="text-left py-2 px-2 font-medium">Item</th>
            <th className="text-right py-2 px-2 font-medium">Qty</th>
            <th className="text-right py-2 px-2 font-medium">CBM</th>
            <th className="text-right py-2 px-2 font-medium">Weight (kg)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {result.items.map((it, i) => (
            <tr key={i}>
              <td className="py-2 px-2 text-gray-800 dark:text-gray-100">
                {it.name || `Item ${i + 1}`}
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {fmt(it.L)} × {fmt(it.W)} × {fmt(it.H)} mm
                </div>
              </td>
              <td className="py-2 px-2 text-right text-gray-800 dark:text-gray-100">{fmt(it.qty)}</td>
              <td className="py-2 px-2 text-right text-gray-800 dark:text-gray-100">{fmt(it.usedCBM, 3)}</td>
              <td className="py-2 px-2 text-right text-gray-800 dark:text-gray-100">{fmt(it.usedKg, 1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-400 dark:text-gray-500">
        Sea LCL freight is charged per W/M = max(CBM, metric tons). Carriers may apply minimums (often 1 W/M) and surcharges separately.
      </p>
    </div>
  );
}
