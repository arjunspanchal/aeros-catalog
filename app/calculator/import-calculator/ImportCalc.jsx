"use client";
import { useEffect, useMemo, useState } from "react";
import { Card, Field, inputCls, PillBtn, Row, SectionHeader } from "@/app/calculator/_components/ui";
import { calcImport, CURRENCIES, DEFAULTS, SHIPMENT_TYPES, getShipmentType } from "@/lib/factoryos/import-calc";

const inr = (n, d = 2) =>
  Number.isFinite(n)
    ? "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d })
    : "—";

const num = (n, d = 2) =>
  Number.isFinite(n) ? n.toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d }) : "—";

const blankItem = () => ({ name: "", qty: "", fobUnit: "", marginPctOverride: "" });

export default function ImportCalc() {
  const [vendors, setVendors] = useState([]);
  const [vendorsState, setVendorsState] = useState("loading"); // "loading" | "ready" | "error"
  const [vendorId, setVendorId] = useState("");

  useEffect(() => {
    let cancelled = false;
    setVendorsState("loading");
    fetch("/api/factoryos/vendors?type=" + encodeURIComponent("Overseas Supplier") + "&activeOnly=1")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status))))
      .then((j) => {
        if (cancelled) return;
        setVendors(Array.isArray(j.vendors) ? j.vendors : []);
        setVendorsState("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setVendorsState("error");
      });
    return () => { cancelled = true; };
  }, []);

  const vendor = vendors.find((v) => v.id === vendorId) || null;

  const [shipmentType, setShipmentType] = useState("40ft_hc");
  const [currency, setCurrency] = useState("USD");
  const [fxRate, setFxRate] = useState(String(DEFAULTS.fxRate));
  const [dutyPct, setDutyPct] = useState(String(DEFAULTS.dutyPct));
  const [marginPct, setMarginPct] = useState(String(DEFAULTS.marginPct));
  const [outputGstPct, setOutputGstPct] = useState(String(DEFAULTS.outputGstPct));

  const [freightCurrency, setFreightCurrency] = useState("INR");
  const [freight, setFreight] = useState({ amount: "", mode: "total" });
  // LCL helper: rate (per CBM, in freightCurrency) × total CBM → fills freight amount.
  const [lclRate, setLclRate] = useState("");
  const [lclCbm, setLclCbm] = useState("");
  const [inland, setInland] = useState({ amount: "", mode: "total" });
  const [unofficial, setUnofficial] = useState({ amount: "", mode: "total" });
  const [handling, setHandling] = useState({ amount: "", mode: "total" });

  const [items, setItems] = useState([
    { name: "Cups", qty: "", fobUnit: "", marginPctOverride: "" },
    { name: "Lids", qty: "", fobUnit: "", marginPctOverride: "" },
  ]);

  // LCL helper: when user enters rate × CBM, mirror the product into the freight
  // total amount. We only auto-fill when both are present so we don't clobber
  // a manually-entered freight figure.
  useEffect(() => {
    if (shipmentType !== "lcl") return;
    const rate = Number(lclRate);
    const cbm = Number(lclCbm);
    if (rate > 0 && cbm > 0) {
      const total = (rate * cbm).toFixed(2);
      setFreight((f) => (f.mode === "total" && f.amount === total ? f : { mode: "total", amount: total }));
    }
  }, [shipmentType, lclRate, lclCbm]);

  const result = useMemo(
    () =>
      calcImport({
        fxRate,
        currency,
        dutyPct,
        marginPct,
        outputGstPct,
        freightCurrency,
        freight,
        inland,
        unofficial,
        handling,
        items,
      }),
    [fxRate, currency, dutyPct, marginPct, outputGstPct, freightCurrency, freight, inland, unofficial, handling, items],
  );

  const symbol = CURRENCIES.find((c) => c.id === currency)?.symbol || "";
  const hasInput = items.some((it) => Number(it.qty) > 0 && Number(it.fobUnit) > 0);

  const setItem = (i, patch) =>
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const addItem = () => setItems((arr) => [...arr, blankItem()]);
  const removeItem = (i) => setItems((arr) => (arr.length > 1 ? arr.filter((_, idx) => idx !== i) : arr));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* ---------------- INPUTS ---------------- */}
      <div className="space-y-4">
        <Card
          title="Vendor"
          right={
            <a
              href="/factoryos/admin/vendors"
              target="_blank"
              rel="noopener"
              className="text-xs text-blue-600 hover:underline dark:text-blue-400"
            >
              Manage vendors →
            </a>
          }
        >
          {vendorsState === "loading" ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">Loading vendors…</p>
          ) : vendorsState === "error" ? (
            <p className="text-sm text-red-600 dark:text-red-400">
              Couldn&apos;t load vendors. Make sure you&apos;re signed into FactoryOS.
            </p>
          ) : (
            <Field
              label="Overseas supplier"
              hint={
                vendors.length === 0
                  ? "No vendors with type 'Overseas Supplier' yet. Add one in the FactoryOS Vendors admin and reload."
                  : "Pulled from the FactoryOS Vendors directory, filtered to Overseas Supplier."
              }
            >
              <select
                className={inputCls}
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                disabled={vendors.length === 0}
              >
                <option value="">— Select supplier —</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
              {vendor && (vendor.contactPerson || vendor.phone || vendor.email) && (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {[vendor.contactPerson, vendor.phone, vendor.email].filter(Boolean).join(" · ")}
                </p>
              )}
            </Field>
          )}
        </Card>

        <Card title="Shipment">
          <Field label="Shipment type" hint={getShipmentType(shipmentType).capLabel}>
            <div className="flex flex-wrap gap-2">
              {SHIPMENT_TYPES.map((s) => (
                <PillBtn key={s.id} active={shipmentType === s.id} onClick={() => setShipmentType(s.id)}>
                  {s.label}
                </PillBtn>
              ))}
            </div>
          </Field>
        </Card>

        <Card title="Currency & rates">
          <div className="grid grid-cols-2 gap-3">
            <Field label="FOB currency" hint="The currency the supplier quotes you in.">
              <div className="flex gap-2">
                {CURRENCIES.map((c) => (
                  <PillBtn key={c.id} active={currency === c.id} onClick={() => setCurrency(c.id)}>
                    {c.id}
                  </PillBtn>
                ))}
              </div>
            </Field>
            <Field label="Exchange rate (₹ per 1 USD)" hint="Used for any non-INR amount.">
              <input
                type="number"
                inputMode="decimal"
                className={inputCls}
                value={fxRate}
                onChange={(e) => setFxRate(e.target.value)}
                placeholder={String(DEFAULTS.fxRate)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-3">
            <Field label="Import Duty + GST (% of CIF)" hint="Combined BCD + SWS + IGST. Default 38%.">
              <input
                type="number"
                inputMode="decimal"
                className={inputCls}
                value={dutyPct}
                onChange={(e) => setDutyPct(e.target.value)}
                placeholder="38"
              />
            </Field>
            <Field label="Margin %" hint="Default for all lines. Override per-line below.">
              <input
                type="number"
                inputMode="decimal"
                className={inputCls}
                value={marginPct}
                onChange={(e) => setMarginPct(e.target.value)}
                placeholder="5"
              />
            </Field>
            <Field label="Output GST %" hint="GST charged to the customer on selling price.">
              <input
                type="number"
                inputMode="decimal"
                className={inputCls}
                value={outputGstPct}
                onChange={(e) => setOutputGstPct(e.target.value)}
                placeholder="18"
              />
            </Field>
          </div>
        </Card>

        <Card title="Items in shipment">
          <div className="space-y-3">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-4">
                  <label className="block text-xs font-medium text-gray-500 mb-1 dark:text-gray-400">Item</label>
                  <input
                    className={inputCls}
                    value={it.name}
                    onChange={(e) => setItem(i, { name: e.target.value })}
                    placeholder="e.g. Cups"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1 dark:text-gray-400">Qty</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    className={inputCls}
                    value={it.qty}
                    onChange={(e) => setItem(i, { qty: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1 dark:text-gray-400">
                    FOB / unit ({symbol || currency})
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    className={inputCls}
                    value={it.fobUnit}
                    onChange={(e) => setItem(i, { fobUnit: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1 dark:text-gray-400">Margin %</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    className={inputCls}
                    value={it.marginPctOverride}
                    onChange={(e) => setItem(i, { marginPctOverride: e.target.value })}
                    placeholder={String(marginPct)}
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    disabled={items.length <= 1}
                    className="text-gray-400 hover:text-red-600 disabled:opacity-30 px-2 py-2 text-sm"
                    title="Remove line"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addItem}
              className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-md hover:border-gray-300 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-300"
            >
              + Add item
            </button>
          </div>
        </Card>

        <Card title="Shipment costs">
          <div className="space-y-3">
            {shipmentType === "lcl" && (
              <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3 dark:bg-blue-900/20 dark:border-blue-900/40">
                <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-2">LCL freight helper</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1 dark:text-gray-400">
                      Rate ({CURRENCIES.find((c) => c.id === freightCurrency)?.symbol}/CBM)
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      className={inputCls}
                      value={lclRate}
                      onChange={(e) => setLclRate(e.target.value)}
                      placeholder="e.g. 80"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1 dark:text-gray-400">Total CBM</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      className={inputCls}
                      value={lclCbm}
                      onChange={(e) => setLclCbm(e.target.value)}
                      placeholder="e.g. 12.5"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 mt-1.5 dark:text-gray-400">
                  Auto-fills the Ocean Freight total below as rate × CBM.
                </p>
              </div>
            )}
            <ShipmentCostRow
              label="Ocean Freight (China → Port)"
              hint={
                shipmentType === "lcl"
                  ? "Total LCL freight. Use the helper above or enter manually. Allocated by FOB share."
                  : `Flat ${getShipmentType(shipmentType).label} container freight. Allocated by FOB share.`
              }
              value={freight}
              onChange={setFreight}
              currency={freightCurrency}
              setCurrency={setFreightCurrency}
              currencyToggle
            />
            <ShipmentCostRow
              label="Inland Transport (port → destination)"
              hint="Trucking from the port of clearance to your warehouse / factory."
              value={inland}
              onChange={setInland}
            />
            <ShipmentCostRow
              label="Unofficial Clearance Cost"
              hint="Off-book port clearance / facilitation."
              value={unofficial}
              onChange={setUnofficial}
            />
            <ShipmentCostRow
              label="Handling + Storage + Cargo"
              hint="Port handling, demurrage, CFS, last-mile cargo handling."
              value={handling}
              onChange={setHandling}
            />
          </div>
        </Card>
      </div>

      {/* ---------------- RESULTS ---------------- */}
      <div className="space-y-4">
        {!hasInput ? (
          <Card title="Per-item landed cost">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enter quantity and FOB unit price for at least one line to see the breakdown.
            </p>
          </Card>
        ) : (
          result.lines.map((l, i) => (
            <Card key={i} title={l.name || `Item ${i + 1}`} className="overflow-hidden">
              <div className="text-xs text-gray-500 mb-2 dark:text-gray-400">
                {num(l.qty, 0)} units · FOB {symbol}{num(l.fobUnitFx, 2)} / unit
              </div>
              <table className="w-full">
                <tbody>
                  <Row label="FOB" value={inr(l.fobUnit)} sub={`${inr(l.fobTotal, 0)} for ${num(l.qty, 0)} ${l.qty === 1 ? "unit" : "units"}`} />
                  <Row label="Ocean Freight" value={inr(l.freightUnit)} sub={inr(l.freightTotal, 0)} />
                  <SectionHeader label="CIF (assessable value)" />
                  <Row label="CIF / unit" value={inr(l.cifUnit)} sub={inr(l.cifTotal, 0)} />
                  <Row label={`Import Duty + GST (${num(l.dutyPct, 0)}% of CIF)`} value={inr(l.dutyUnit)} sub={inr(l.dutyTotal, 0)} />
                  <Row label="Inland Transport" value={inr(l.inlandUnit)} sub={inr(l.inlandTotal, 0)} />
                  <Row label="Unofficial Clearance" value={inr(l.unofficialUnit)} sub={inr(l.unofficialTotal, 0)} />
                  <Row label="Handling + Storage + Cargo" value={inr(l.handlingUnit)} sub={inr(l.handlingTotal, 0)} />
                  <Row label="Total Landed Cost (Ex-GST)" value={inr(l.landedUnit)} sub={inr(l.landedTotal, 0)} highlight />
                  <SectionHeader label={`Margin @ ${num(l.marginPct, 1)}%`} />
                  <Row label="Margin Added" value={inr(l.marginUnit)} sub={inr(l.marginTotal, 0)} />
                  <Row label="Selling Price (Ex-GST)" value={inr(l.sellingExGstUnit)} sub={inr(l.sellingExGstTotal, 0)} />
                  <Row label={`GST @ ${num(l.outputGstPct, 0)}%`} value={inr(l.outputGstUnit)} sub={inr(l.outputGstTotal, 0)} />
                  <Row label="Final Selling Price (Incl. GST)" value={inr(l.finalSellingUnit)} sub={inr(l.finalSellingTotal, 0)} highlight />
                </tbody>
              </table>
            </Card>
          ))
        )}

        {hasInput && (
          <Card title="Shipment totals">
            <p className="text-xs text-gray-500 mb-2 dark:text-gray-400">
              {vendor ? `${vendor.name} · ` : ""}
              {getShipmentType(shipmentType).label}
              {shipmentType === "lcl" && Number(lclCbm) > 0 ? ` · ${lclCbm} CBM` : ""}
            </p>
            <table className="w-full">
              <tbody>
                <Row label="Total FOB" value={inr(result.totals.fob, 0)} />
                <Row label="Total Ocean Freight" value={inr(result.totals.freight, 0)} />
                <Row label="Total CIF" value={inr(result.totals.cif, 0)} />
                <Row label="Total Import Duty + GST" value={inr(result.totals.duty, 0)} />
                <Row label="Total Inland Transport" value={inr(result.totals.inland, 0)} />
                <Row label="Total Unofficial Clearance" value={inr(result.totals.unofficial, 0)} />
                <Row label="Total Handling + Storage" value={inr(result.totals.handling, 0)} />
                <Row label="Total Landed Cost (Ex-GST)" value={inr(result.totals.landed, 0)} highlight />
                <Row label="Total Margin Added" value={inr(result.totals.margin, 0)} />
                <Row label="Total Selling Price (Ex-GST)" value={inr(result.totals.sellingExGst, 0)} />
                <Row label="Total Output GST" value={inr(result.totals.outputGst, 0)} />
                <Row label="Total Final Selling Price (Incl. GST)" value={inr(result.totals.finalSelling, 0)} highlight />
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}

function ShipmentCostRow({ label, hint, value, onChange, currency, setCurrency, currencyToggle }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</label>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onChange({ ...value, mode: "total" })}
            className={`px-2 py-0.5 text-[10px] rounded ${
              value.mode === "total" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
            }`}
          >
            Total
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...value, mode: "perUnit" })}
            className={`px-2 py-0.5 text-[10px] rounded ${
              value.mode === "perUnit" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
            }`}
          >
            Per unit
          </button>
        </div>
      </div>
      <div className="flex gap-2">
        <input
          type="number"
          inputMode="decimal"
          className={inputCls}
          value={value.amount}
          onChange={(e) => onChange({ ...value, amount: e.target.value })}
          placeholder={value.mode === "total" ? "Total for shipment" : "Per unit (across all items)"}
        />
        {currencyToggle && (
          <select
            className={`${inputCls} w-24 shrink-0`}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {CURRENCIES.map((c) => (
              <option key={c.id} value={c.id}>{c.id}</option>
            ))}
          </select>
        )}
      </div>
      {hint && <p className="text-[11px] text-gray-400 mt-1 dark:text-gray-500">{hint}</p>}
    </div>
  );
}
