"use client";

// Domestic logistics rate calculator (Delhivery B2B). All maths lives in
// lib/logistics/delhivery.js — deterministic, contract-exact. This component
// is the workflow: items from the master catalogue, vendor (or warehouse)
// origin, saved delivery addresses, itemised cost breakdown, quote log.

import { useMemo, useState } from "react";
import { computeQuote, laneAndState, stateToZone } from "@/lib/logistics/delhivery";

const WAREHOUSE = { label: "Aeros Warehouse — Bhiwandi", pincode: "421302" };

const inputCls =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100";
const cardCls =
  "rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900";
const btnCls =
  "rounded-md bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:bg-gray-700 disabled:opacity-40 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300";

const inr = (v) =>
  "₹" + (+v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function LogisticsCalc({ initialData }) {
  const { config, zoneMatrix, laneRates, zoneMap, products, clients = [] } = initialData;
  const [vendors, setVendors] = useState(initialData.vendors || []);
  const [addresses, setAddresses] = useState(initialData.addresses || []);

  // origin
  const [originKind, setOriginKind] = useState("warehouse"); // 'warehouse' | 'vendor'
  const [vendorId, setVendorId] = useState("");
  const [vendorPin, setVendorPin] = useState("");

  // destination
  const [addressId, setAddressId] = useState("");
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [newAddr, setNewAddr] = useState({ client_id: "", label: "", pincode: "", address_line: "", city: "", is_oda: false });
  const [addrBusy, setAddrBusy] = useState(false);

  // shipment
  const [lines, setLines] = useState([{ productId: "", search: "", qty: "" }]);
  const [declaredValue, setDeclaredValue] = useState("");
  const [odaOverride, setOdaOverride] = useState(null); // null = follow address flag
  const [saveState, setSaveState] = useState("");

  const vendor = vendors.find((v) => v.id === vendorId) || null;
  const originPincode = originKind === "warehouse" ? WAREHOUSE.pincode : (vendor?.pincode || vendorPin).trim();
  const address = addresses.find((a) => a.id === addressId) || null;
  const destPincode = address?.pincode || "";
  const isOda = odaOverride ?? !!address?.is_oda;

  // Master data first; manual overrides fill the gaps (several categories have
  // no case-pack or weight data yet — they must still be quotable).
  const engineLines = useMemo(
    () =>
      lines
        .map((l) => {
          const p = products.find((x) => x.id === l.productId);
          if (!p || !+l.qty) return null;
          const unitsPerCase = p.units_per_case || +l.ovrUnits || 0;
          const grossWeightKg = p.gross_weight_kg || +l.ovrCaseKg || 0;
          if (!unitsPerCase || (!grossWeightKg && !p.volumetric_weight_kg && !p.carton_dimensions)) return null;
          return {
            sku: p.sku,
            name: p.product_name,
            qty: +l.qty,
            unitsPerCase,
            grossWeightKg,
            volumetricWeightKg: p.volumetric_weight_kg,
            cartonDimensions: p.carton_dimensions,
          };
        })
        .filter(Boolean),
    [lines, products],
  );

  const quote = useMemo(() => {
    if (!engineLines.length || !/^\d{6}$/.test(originPincode) || !/^\d{6}$/.test(destPincode)) return null;
    return computeQuote({
      lines: engineLines,
      originPincode,
      destPincode,
      isOda,
      declaredValue: +declaredValue || 0,
      config,
      zoneMap,
      zoneMatrix,
      laneRates,
    });
  }, [engineLines, originPincode, destPincode, isOda, declaredValue, config, zoneMap, zoneMatrix, laneRates]);

  function setLine(i, patch) {
    setLines((prev) => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  }

  async function rememberVendorPin() {
    if (!vendor || vendor.pincode || !/^\d{6}$/.test(vendorPin)) return;
    const res = await fetch("/api/logistics/vendor-pincode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendorId: vendor.id, pincode: vendorPin }),
    });
    if (res.ok) {
      setVendors((prev) => prev.map((v) => (v.id === vendor.id ? { ...v, pincode: vendorPin } : v)));
    }
  }

  async function createAddress() {
    setAddrBusy(true);
    try {
      const st = laneAndState(newAddr.pincode).state;
      const res = await fetch("/api/logistics/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newAddr, state: st }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Save failed");
      const clientName = clients.find((c) => c.id === newAddr.client_id)?.name || "";
      setAddresses((prev) => [{ ...body.address, client_name: clientName }, ...prev]);
      setAddressId(body.address.id);
      setShowNewAddress(false);
      setNewAddr({ client_id: "", label: "", pincode: "", address_line: "", city: "", is_oda: false });
    } catch (e) {
      alert(e.message);
    } finally {
      setAddrBusy(false);
    }
  }

  async function saveQuote() {
    if (!quote || quote.error) return;
    setSaveState("saving");
    try {
      const res = await fetch("/api/logistics/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin_kind: originKind,
          vendor_id: originKind === "vendor" ? vendor?.id || null : null,
          origin_label: originKind === "warehouse" ? WAREHOUSE.label : vendor?.name || "Vendor",
          origin_pincode: originPincode,
          address_id: address?.id || null,
          dest_label: address?.label || null,
          dest_pincode: destPincode,
          lines: quote.lines.map(({ sku, name, qty, cases, actualKg, volKg }) => ({ sku, name, qty, cases, actual_kg: actualKg, vol_kg: volKg })),
          declared_value: +declaredValue || null,
          breakdown: {
            rate: quote.rate,
            charges: quote.charges,
            weightBasis: quote.weightBasis,
            isOda,
            total_units: quote.totalUnits,
            per_case_ex_gst: quote.perCaseExGst,
            per_unit_ex_gst: quote.perUnitExGst,
          },
          chargeable_kg: quote.chargeableKg,
          total_ex_gst: quote.totalExGst,
          gst_inr: quote.gst,
          total_inr: quote.total,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Save failed");
      await rememberVendorPin();
      setSaveState("saved");
      setTimeout(() => setSaveState(""), 2500);
    } catch (e) {
      alert(e.message);
      setSaveState("");
    }
  }

  const destInfo = destPincode ? laneAndState(destPincode) : null;
  const destZone = destInfo?.state ? stateToZone(destInfo.state, zoneMap) : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      {/* ---------------- left: inputs ---------------- */}
      <div className="space-y-5">
        {/* Origin */}
        <section className={cardCls}>
          <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Origin (pickup)</h2>
          <div className="mb-3 flex gap-2">
            {[
              ["warehouse", "Warehouse"],
              ["vendor", "Vendor"],
            ].map(([k, label]) => (
              <button
                key={k}
                onClick={() => setOriginKind(k)}
                className={
                  originKind === k
                    ? "rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold text-white dark:bg-gray-100 dark:text-gray-900"
                    : "rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-300"
                }
              >
                {label}
              </button>
            ))}
          </div>
          {originKind === "warehouse" ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {WAREHOUSE.label} · {WAREHOUSE.pincode}
            </p>
          ) : (
            <div className="space-y-2">
              <select value={vendorId} onChange={(e) => { setVendorId(e.target.value); setVendorPin(""); }} className={inputCls}>
                <option value="">Select vendor…</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                    {v.pincode ? ` (${v.pincode})` : ""}
                  </option>
                ))}
              </select>
              {vendor && !vendor.pincode && (
                <input
                  value={vendorPin}
                  onChange={(e) => setVendorPin(e.target.value)}
                  placeholder="Vendor pincode (saved for next time)"
                  className={inputCls}
                  maxLength={6}
                />
              )}
            </div>
          )}
        </section>

        {/* Destination */}
        <section className={cardCls}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Delivery address</h2>
            <button onClick={() => setShowNewAddress((s) => !s)} className="text-xs font-medium text-gray-500 hover:text-gray-900 dark:hover:text-gray-100">
              {showNewAddress ? "cancel" : "+ new address"}
            </button>
          </div>
          {showNewAddress ? (
            <div className="space-y-2">
              <select value={newAddr.client_id} onChange={(e) => setNewAddr({ ...newAddr, client_id: e.target.value })} className={inputCls}>
                <option value="">Customer (from clients master)…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <input placeholder="Label (e.g. Zepto Hoskote WH)" value={newAddr.label} onChange={(e) => setNewAddr({ ...newAddr, label: e.target.value })} className={inputCls} />
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="Pincode" maxLength={6} value={newAddr.pincode} onChange={(e) => setNewAddr({ ...newAddr, pincode: e.target.value })} className={inputCls} />
                <input placeholder="City" value={newAddr.city} onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })} className={inputCls} />
              </div>
              <input placeholder="Address line (optional)" value={newAddr.address_line} onChange={(e) => setNewAddr({ ...newAddr, address_line: e.target.value })} className={inputCls} />
              {/^\d{6}$/.test(newAddr.pincode) && (
                <p className="text-[11px] text-gray-500">Detected: {laneAndState(newAddr.pincode).state || "unknown state"}</p>
              )}
              <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <input type="checkbox" checked={newAddr.is_oda} onChange={(e) => setNewAddr({ ...newAddr, is_oda: e.target.checked })} />
                ODA pincode (₹{+(config?.oda_flat_inr ?? 1500)} flat surcharge)
              </label>
              <button onClick={createAddress} disabled={addrBusy || !newAddr.client_id || !newAddr.label || !/^\d{6}$/.test(newAddr.pincode)} className={btnCls}>
                {addrBusy ? "Saving…" : "Save to customer master"}
              </button>
            </div>
          ) : (
            <select value={addressId} onChange={(e) => { setAddressId(e.target.value); setOdaOverride(null); }} className={inputCls}>
              <option value="">Select customer address…</option>
              {[...new Set(addresses.map((a) => a.client_name))].map((cn) => (
                <optgroup key={cn || "other"} label={cn || "Other"}>
                  {addresses
                    .filter((a) => a.client_name === cn)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label} — {a.pincode}
                        {a.is_oda ? " (ODA)" : ""}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          )}
          {address && (
            <label className="mt-2 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <input type="checkbox" checked={isOda} onChange={(e) => setOdaOverride(e.target.checked)} />
              ODA surcharge applies to this shipment
            </label>
          )}
        </section>

        {/* Items */}
        <section className={cardCls}>
          <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Items</h2>
          <div className="space-y-3">
            {lines.map((line, i) => {
              const picked = products.find((p) => p.id === line.productId);
              const q = line.search.trim().toLowerCase();
              const matches =
                !picked && q.length >= 2
                  ? products.filter((p) => `${p.sku} ${p.product_name} ${p.category || ""}`.toLowerCase().includes(q)).slice(0, 8)
                  : [];
              return (
                <div key={i} className="rounded-md border border-gray-200 p-2 dark:border-gray-700">
                  {picked ? (
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 text-xs">
                          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{picked.sku} — {picked.product_name}</p>
                          <p className="text-gray-500">
                            {picked.category} · {picked.units_per_case ? `${picked.units_per_case}/case` : "case pack ?"} ·{" "}
                            {picked.gross_weight_kg ? `${picked.gross_weight_kg} kg` : "wt ?"}
                            {picked.volumetric_weight_kg ? ` · vol ${picked.volumetric_weight_kg} kg` : ""}
                          </p>
                        </div>
                        <button onClick={() => setLine(i, { productId: "", search: "", ovrUnits: "", ovrCaseKg: "" })} className="text-xs text-gray-400 hover:text-red-600">✕</button>
                      </div>
                      {(!picked.units_per_case || (!picked.gross_weight_kg && !picked.volumetric_weight_kg && !picked.carton_dimensions)) && (
                        <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 dark:border-amber-800 dark:bg-amber-950/30">
                          <p className="mb-1.5 text-[10px] font-medium text-amber-800 dark:text-amber-300">
                            Master is missing packing data for this SKU — enter it to quote:
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {!picked.units_per_case && (
                              <input type="number" min="1" placeholder="Units per case" value={line.ovrUnits || ""} onChange={(e) => setLine(i, { ovrUnits: e.target.value })} className={inputCls} />
                            )}
                            {!picked.gross_weight_kg && !picked.volumetric_weight_kg && !picked.carton_dimensions && (
                              <input type="number" min="0" step="0.1" placeholder="Case weight (kg)" value={line.ovrCaseKg || ""} onChange={(e) => setLine(i, { ovrCaseKg: e.target.value })} className={inputCls} />
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        placeholder="Search SKU or product…"
                        value={line.search}
                        onChange={(e) => setLine(i, { search: e.target.value })}
                        className={inputCls}
                      />
                      {matches.length > 0 && (
                        <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                          {matches.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => setLine(i, { productId: p.id, search: "" })}
                              className="block w-full px-3 py-1.5 text-left text-xs text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                            >
                              {p.sku} — {p.product_name}
                              <span className="ml-1 text-[10px] text-gray-400">{p.category}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <input
                    type="number"
                    min="0"
                    placeholder="Quantity (pcs)"
                    value={line.qty}
                    onChange={(e) => setLine(i, { qty: e.target.value })}
                    className={inputCls + " mt-2"}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => setLines((p) => [...p, { productId: "", search: "", qty: "" }])} className="text-xs font-medium text-gray-500 hover:text-gray-900 dark:hover:text-gray-100">
              + add item
            </button>
            {lines.length > 1 && (
              <button onClick={() => setLines((p) => p.slice(0, -1))} className="text-xs text-gray-400 hover:text-red-600">
                remove last
              </button>
            )}
          </div>
          <input
            type="number"
            min="0"
            placeholder="Declared invoice value ₹ (for FOV)"
            value={declaredValue}
            onChange={(e) => setDeclaredValue(e.target.value)}
            className={inputCls + " mt-3"}
          />
        </section>
      </div>

      {/* ---------------- right: result ---------------- */}
      <div className="space-y-5">
        {quote?.error && (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            {quote.error}
          </div>
        )}
        {quote && !quote.error ? (
          <>
            <section className={cardCls}>
              <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Shipment</h2>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-700 dark:text-gray-300 sm:grid-cols-4">
                <div><p className="text-xs text-gray-400">Cases</p><p className="font-mono">{quote.cases}</p></div>
                <div><p className="text-xs text-gray-400">Actual</p><p className="font-mono">{quote.actualKg} kg</p></div>
                <div><p className="text-xs text-gray-400">Volumetric</p><p className="font-mono">{quote.volKg} kg</p></div>
                <div>
                  <p className="text-xs text-gray-400">Chargeable ({quote.weightBasis})</p>
                  <p className="font-mono font-semibold">{quote.chargeableKg} kg</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                {quote.rate.originState} → {quote.rate.destState} · {quote.rate.basis} @ ₹{quote.rate.ratePerKg}/kg
                {quote.rate.assumed && (
                  <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                    zone mapping assumed — confirm with Delhivery
                  </span>
                )}
              </p>
            </section>

            <section className={cardCls}>
              <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Cost breakdown</h2>
              <dl className="space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
                {[
                  [`Base freight (${quote.chargeableKg} kg × ₹${quote.rate.ratePerKg})`, quote.charges.baseFreight],
                  [`Fuel surcharge (${quote.config.fscPct}%)`, quote.charges.fsc],
                  ["Docket / waybill (per LR)", quote.charges.docket],
                  [`FOV / ROV (${quote.config.fovPct}% of declared, min ₹${quote.config.fovMin})`, quote.charges.fov],
                  ...(quote.charges.handling ? [[`Handling (≥${quote.config.handlingThresholdKg} kg @ ₹${quote.config.handlingRatePerKg}/kg)`, quote.charges.handling]] : []),
                  ...(quote.charges.oda ? [["ODA surcharge", quote.charges.oda]] : []),
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between">
                    <dt>{label}</dt>
                    <dd className="font-mono">{inr(val)}</dd>
                  </div>
                ))}
                <div className="flex justify-between border-t border-gray-200 pt-2 font-medium dark:border-gray-700">
                  <dt>Subtotal (ex-GST)</dt>
                  <dd className="font-mono">{inr(quote.totalExGst)}</dd>
                </div>
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <dt>IGST {quote.config.gstPct}% (recoverable ITC)</dt>
                  <dd className="font-mono">{inr(quote.gst)}</dd>
                </div>
                <div className="flex justify-between border-t border-gray-300 pt-2 text-base font-bold text-gray-900 dark:border-gray-600 dark:text-white">
                  <dt>Total shipment cost</dt>
                  <dd className="font-mono">{inr(quote.total)}</dd>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <dt>Effective</dt>
                  <dd className="font-mono">{inr(quote.perKg)}/kg incl. GST</dd>
                </div>
                <div className="mt-2 rounded-md bg-gray-50 px-3 py-2 dark:bg-gray-800/60">
                  <div className="flex justify-between text-sm font-medium text-gray-800 dark:text-gray-200">
                    <dt>Freight per case (ex-GST)</dt>
                    <dd className="font-mono">{inr(quote.perCaseExGst)}</dd>
                  </div>
                  <div className="flex justify-between text-sm font-medium text-gray-800 dark:text-gray-200">
                    <dt>Freight per unit (ex-GST)</dt>
                    <dd className="font-mono">₹{quote.perUnitExGst.toFixed(4)} <span className="text-xs text-gray-400">/ pc × {quote.totalUnits.toLocaleString("en-IN")}</span></dd>
                  </div>
                  <p className="mt-1 text-[10px] text-gray-400">
                    Ex-GST is the number to absorb into product cost — freight GST is recoverable ITC.
                  </p>
                </div>
              </dl>
              <button onClick={saveQuote} disabled={saveState === "saving"} className={btnCls + " mt-4 w-full py-2.5"}>
                {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved ✓" : "Save quote to log"}
              </button>
            </section>
          </>
        ) : (
          <section className={cardCls + " text-sm text-gray-400"}>
            <p>Pick items, an origin and a delivery address to price the shipment.</p>
            {destZone && (
              <p className="mt-2 text-xs">
                Destination {destInfo.state} → zone {destZone.zone}
                {destZone.status !== "confirmed" ? " (assumed)" : ""}
              </p>
            )}
          </section>
        )}
        <p className="text-[11px] leading-relaxed text-gray-400">
          Rates: Delhivery B2B Addendum eff. 01/01/2026 · chargeable = max(dead, volumetric ÷3375) · min 10 kg &
          ₹150/LR · GST shown separately (recoverable ITC — never load it into customer prices). Demurrage, COD/ToPay
          and appointment-delivery charges are excluded — add from the contract if the shipment needs them.
        </p>
      </div>
    </div>
  );
}
