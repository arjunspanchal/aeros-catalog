"use client";
import { useEffect, useMemo, useState } from "react";
import {
  calculate,
  CUP_PRESETS, PACKING_PRESETS, CASE_PACK_DEFAULTS,
  SW_DIMS, OF_DIMS, SIZE_OPTS, PRINT_OPTS, COATING_OPTS,
  COATING_RATES, DEFAULTS, PACK_LABOUR_PER_CUP, MONTHLY_CAPACITY,
  getOuterFanCount, getSidewallDims,
} from "@/lib/calc/cup-calculator";

const STORAGE_PREFIX = "aeros:cup:order:";

// Self-contained styles scoped to `.cup-app`. Dark-mode variants track the
// `html.dark` flag set by the catalog's ThemeToggle.
const css = `
.cup-app{
  --bg-primary:#ffffff;
  --bg-secondary:#f9fafb;
  --text-primary:#111827;
  --text-secondary:#4b5563;
  --text-tertiary:#9ca3af;
  --text-success:#15803d;
  --border-secondary:#e5e7eb;
  --border-tertiary:#f3f4f6;
  --accent:#2563eb;
  --accent-dark:#1d4ed8;
  --accent-bg:#eff6ff;
  --accent-border:#bfdbfe;
  --warn-bg:#fffbeb;
  --warn-border:#fde68a;
  --warn-text:#92400e;
  --margin-text:#b45309;
  --radius-md:8px;
  --radius-lg:12px;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
  font-size:14px;
  color:var(--text-primary);
}
html.dark .cup-app{
  --bg-primary:#111827;
  --bg-secondary:#1f2937;
  --text-primary:#e5e7eb;
  --text-secondary:#9ca3af;
  --text-tertiary:#6b7280;
  --text-success:#4ade80;
  --border-secondary:#374151;
  --border-tertiary:#1f2937;
  --accent-bg:rgba(37,99,235,0.15);
  --accent-border:rgba(37,99,235,0.4);
  --warn-bg:rgba(234,179,8,0.12);
  --warn-border:rgba(234,179,8,0.3);
  --warn-text:#fbbf24;
  --margin-text:#fbbf24;
}
.cup-app *{box-sizing:border-box}
.cup-app h1{font-size:20px;font-weight:500;margin:0 0 2px}
.cup-app .sub{font-size:13px;color:var(--text-secondary);margin-bottom:1.25rem}
.cup-app .card{background:var(--bg-primary);border:0.5px solid var(--border-tertiary);border-radius:var(--radius-lg);padding:1rem 1.25rem;margin-bottom:1rem}
.cup-app .card-title{font-size:11px;font-weight:500;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.06em;margin-bottom:1rem}
.cup-app .field-row{display:flex;gap:12px;margin-bottom:.75rem;flex-wrap:wrap}
.cup-app .field{display:flex;flex-direction:column;gap:4px;flex:1;min-width:120px}
.cup-app .field label{font-size:12px;color:var(--text-secondary)}
.cup-app .field input,.cup-app .field select{width:100%;padding:7px 10px;border:0.5px solid var(--border-secondary);border-radius:var(--radius-md);font-size:13px;background:var(--bg-primary);color:var(--text-primary);outline:none}
.cup-app .field input:focus,.cup-app .field select:focus{border-color:var(--accent);box-shadow:0 0 0 2px rgba(37,99,235,0.15)}
.cup-app .chips{display:flex;flex-wrap:wrap;gap:6px}
.cup-app .chip{padding:5px 12px;border:0.5px solid var(--border-secondary);border-radius:var(--radius-md);font-size:12px;cursor:pointer;background:var(--bg-primary);color:var(--text-secondary);transition:all 0.12s}
.cup-app .chip.sel{background:var(--accent);color:#fff;border-color:var(--accent)}
.cup-app .autofill{font-size:11px;color:var(--text-success);margin-top:3px}
.cup-app .preset-badge{display:inline-flex;align-items:center;gap:4px;background:var(--accent-bg);color:var(--accent-dark);border:0.5px solid var(--accent-border);border-radius:var(--radius-md);font-size:11px;padding:3px 8px;margin-top:4px}
html.dark .cup-app .preset-badge{color:#93c5fd}
.cup-app .spec-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:.75rem}
.cup-app .spec-cell{background:var(--bg-secondary);border-radius:var(--radius-md);padding:8px 10px}
.cup-app .spec-cell .sc-label{font-size:11px;color:var(--text-tertiary);margin-bottom:2px}
.cup-app .spec-cell .sc-val{font-size:13px;font-weight:500}
.cup-app .result-card{background:var(--bg-primary);border:0.5px solid var(--border-tertiary);border-radius:var(--radius-lg);overflow:hidden;margin-top:1.25rem}
.cup-app .sp-highlight{background:var(--accent-bg);border-radius:var(--radius-md);padding:.75rem 1rem;margin-top:.75rem;display:flex;justify-content:space-between;align-items:center}
.cup-app .sp-label{font-size:12px;color:var(--accent-dark)}
html.dark .cup-app .sp-label,html.dark .cup-app .sp-val{color:#93c5fd}
.cup-app .sp-val{font-size:24px;font-weight:500;color:var(--accent-dark)}
.cup-app .weight-box{background:var(--bg-secondary);border-radius:var(--radius-md);padding:.75rem 1rem;margin-top:.5rem;display:flex;justify-content:space-between;align-items:center}
.cup-app .breakdown-row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:0.5px solid var(--border-tertiary);font-size:13px}
.cup-app .breakdown-row:last-child{border-bottom:none}
.cup-app .breakdown-row .lbl{color:var(--text-secondary)}
.cup-app .breakdown-row .val{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px}
.cup-app .breakdown-row.total .lbl,.cup-app .breakdown-row.total .val{font-weight:500;font-size:14px}
.cup-app .breakdown-row.margin-row .val{color:var(--margin-text)}
.cup-app .memo-box{background:var(--warn-bg);border-top:0.5px solid var(--warn-border);padding:.75rem 1.25rem;font-size:12px;color:var(--warn-text)}
.cup-app .memo-box .memo-title{font-weight:500;margin-bottom:4px}
.cup-app .calc-btn{width:100%;padding:11px;background:var(--accent);color:#fff;border:none;border-radius:var(--radius-md);font-size:14px;font-weight:500;cursor:pointer;margin-top:.5rem;transition:background 0.15s}
.cup-app .calc-btn:hover{background:var(--accent-dark)}
.cup-app .reset-btn{width:100%;padding:9px;background:var(--bg-secondary);color:var(--text-secondary);border:0.5px solid var(--border-secondary);border-radius:var(--radius-md);font-size:13px;cursor:pointer;margin-top:.5rem}
.cup-app .sect-divider{font-size:11px;font-weight:500;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.08em;margin:1rem 0 .75rem;display:flex;align-items:center;gap:8px}
.cup-app .sect-divider::after{content:'';flex:1;height:0.5px;background:var(--border-tertiary)}
.cup-app .two-col{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.cup-app .dim-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
.cup-app .expander-btn{width:100%;display:flex;justify-content:space-between;align-items:center;background:none;border:none;cursor:pointer;padding:0;color:var(--text-primary)}
.cup-app .apply-btn{background:var(--accent);color:#fff;border:none;border-radius:var(--radius-md);padding:5px 12px;font-size:12px;cursor:pointer}
.cup-app .saved-order-tag{display:inline-flex;align-items:center;gap:6px;background:var(--accent-bg);color:var(--accent-dark);border:0.5px solid var(--accent-border);border-radius:var(--radius-md);padding:4px 10px;font-size:12px}
html.dark .cup-app .saved-order-tag{color:#93c5fd}
.cup-app .del-btn{background:none;border:none;cursor:pointer;color:#ef4444;font-size:12px;padding:0}
.cup-app .ghost-btn{font-size:12px;background:none;border:0.5px solid var(--border-secondary);border-radius:var(--radius-md);padding:5px 12px;cursor:pointer;color:var(--text-secondary)}
.cup-app .save-input{flex:1;padding:7px 10px;border:0.5px solid var(--border-secondary);border-radius:var(--radius-md);font-size:13px;background:var(--bg-primary);color:var(--text-primary);outline:none}
.cup-app .soft-note{background:var(--bg-secondary);border-radius:var(--radius-md);padding:10px 12px;margin-bottom:1rem}
@media(max-width:460px){
  .cup-app .two-col{grid-template-columns:1fr}
  .cup-app .dim-row{grid-template-columns:1fr 1fr}
  .cup-app .spec-row{grid-template-columns:1fr 1fr}
}
`;

function Field({ label, children, note, badge }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {badge && <span className="preset-badge">⚡ {badge}</span>}
      {note && <span className="autofill">✓ {note}</span>}
    </div>
  );
}

function NumInput({ value, onChange, placeholder, step }) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange && onChange(e.target.value)}
      placeholder={placeholder || "0"}
      step={step || "any"}
    />
  );
}

function Chip({ label, selected, onClick }) {
  return (
    <button type="button" className={`chip${selected ? " sel" : ""}`} onClick={onClick}>
      {label}
    </button>
  );
}

function CoatingSection({ coating, setCoating, coatingRate, setCoatingRate }) {
  return (
    <div>
      <div className="field" style={{ marginBottom: ".75rem" }}>
        <label>Coating</label>
        <div className="chips" style={{ marginTop: 4 }}>
          {COATING_OPTS.map((o) => (
            <Chip key={o} label={o} selected={coating === o} onClick={() => setCoating(o)} />
          ))}
        </div>
        {coating && coating !== "None" && COATING_RATES[coating] && (
          <span className="autofill">✓ {coating} rate: ₹{COATING_RATES[coating]}/kg</span>
        )}
      </div>
      {coating && coating !== "None" && !COATING_RATES[coating] && (
        <div className="field-row">
          <Field label="Coating rate (₹/kg)">
            <NumInput value={coatingRate} onChange={setCoatingRate} placeholder="e.g. 18" />
          </Field>
        </div>
      )}
    </div>
  );
}

function PrintSection({ print, setPrint, colors, setColors, rate1, setRate1, rateN, setRateN }) {
  const isFlex = print === "Flexo";
  const isOff = print === "Offset";
  const nc = parseInt(colors) || 0;
  return (
    <div>
      <div className="field" style={{ marginBottom: ".75rem" }}>
        <label>Printing method</label>
        <div className="chips" style={{ marginTop: 4 }}>
          {PRINT_OPTS.map((o) => (
            <Chip key={o} label={o} selected={print === o} onClick={() => setPrint(o)} />
          ))}
        </div>
      </div>
      {isFlex && (
        <div className="field-row">
          <Field label="No. of colours">
            <NumInput value={colors} onChange={setColors} placeholder="e.g. 2" />
          </Field>
          <Field label="1st colour rate (₹/kg)">
            <NumInput value={rate1} onChange={setRate1} placeholder="e.g. 8" />
          </Field>
          {nc > 1 && (
            <Field label="Subsequent colour rate (₹/kg)">
              <NumInput value={rateN} onChange={setRateN} placeholder="e.g. 5" />
            </Field>
          )}
        </div>
      )}
      {isOff && (
        <div className="field-row">
          <Field
            label="No. of colours"
            note={nc > 0 ? `Die cost: ₹${(nc * DEFAULTS.offsetDie).toLocaleString()} (billed separately)` : ""}
          >
            <NumInput value={colors} onChange={setColors} placeholder="e.g. 4" />
          </Field>
        </div>
      )}
      {isFlex && nc > 0 && (
        <div className="autofill" style={{ marginBottom: ".5rem" }}>
          ✓ Plate cost: ₹{(nc * DEFAULTS.flexoPlate).toLocaleString()} (billed separately)
        </div>
      )}
    </div>
  );
}

function getFormSnapshot(s) {
  return {
    cupVariant: s.cupVariant, size: s.size, sku: s.sku, qty: s.qty, casePack: s.casePack, margin: s.margin,
    td: s.td, bd: s.bd, h: s.h, boxL: s.boxL, boxW: s.boxW, boxH: s.boxH,
    swGSM: s.swGSM, swRate: s.swRate, swCoating: s.swCoating, swCoatingRate: s.swCoatingRate,
    swPrint: s.swPrint, swColors: s.swColors, swRate1: s.swRate1, swRateN: s.swRateN,
    btGSM: s.btGSM, btRate: s.btRate, btCoating: s.btCoating, btCoatingRate: s.btCoatingRate,
    conv: s.conv, pack: s.pack, glue: s.glue, otherCost: s.otherCost,
    convSalary: s.convSalary, convElec: s.convElec, convRent: s.convRent,
    packPoly: s.packPoly, packCarton: s.packCarton,
    ofGSM: s.ofGSM, ofRate: s.ofRate, ofCoating: s.ofCoating, ofCoatingRate: s.ofCoatingRate,
    ofPrint: s.ofPrint, ofColors: s.ofColors, ofRate1: s.ofRate1, ofRateN: s.ofRateN,
  };
}

function loadSavedOrders(scope) {
  if (typeof window === "undefined") return [];
  const orders = [];
  const prefix = `${STORAGE_PREFIX}${scope}:`;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      try {
        const value = localStorage.getItem(key);
        if (value) orders.push({ key, ...JSON.parse(value) });
      } catch {}
    }
  }
  return orders.sort((a, b) => (a.label || "").localeCompare(b.label || ""));
}

export default function CupCalculator({ scope = "default" }) {
  const [cupVariant, setCupVariant] = useState("");
  const [size, setSize] = useState("");
  const [sku, setSku] = useState("");
  const [qty, setQty] = useState("");
  const [casePack, setCasePack] = useState("");
  const [margin, setMargin] = useState("");
  const [td, setTd] = useState(""); const [bd, setBd] = useState(""); const [h, setH] = useState("");
  const [boxL, setBoxL] = useState(""); const [boxW, setBoxW] = useState(""); const [boxH, setBoxH] = useState("");
  const [swGSM, setSwGSM] = useState(""); const [swRate, setSwRate] = useState("");
  const [swCoating, setSwCoating] = useState("None"); const [swCoatingRate, setSwCoatingRate] = useState("");
  const [swPrint, setSwPrint] = useState("No printing"); const [swColors, setSwColors] = useState("");
  const [swRate1, setSwRate1] = useState(""); const [swRateN, setSwRateN] = useState("");
  const [btGSM, setBtGSM] = useState(""); const [btRate, setBtRate] = useState("");
  const [btCoating, setBtCoating] = useState("None"); const [btCoatingRate, setBtCoatingRate] = useState("");
  const [conv, setConv] = useState(""); const [pack, setPack] = useState("");
  const [glue, setGlue] = useState(""); const [otherCost, setOtherCost] = useState("");
  const [showConvCalc, setShowConvCalc] = useState(false);
  const [convSalary, setConvSalary] = useState("185000");
  const [convElec, setConvElec] = useState("100000");
  const [convRent, setConvRent] = useState("112500");
  const [showPackCalc, setShowPackCalc] = useState(false);
  const [packPoly, setPackPoly] = useState(""); const [packCarton, setPackCarton] = useState("");
  const [ofGSM, setOfGSM] = useState(""); const [ofRate, setOfRate] = useState("");
  const [ofCoating, setOfCoating] = useState("None"); const [ofCoatingRate, setOfCoatingRate] = useState("");
  const [ofPrint, setOfPrint] = useState("No printing"); const [ofColors, setOfColors] = useState("");
  const [ofRate1, setOfRate1] = useState(""); const [ofRateN, setOfRateN] = useState("");
  const [result, setResult] = useState(null);
  const [presetLocked, setPresetLocked] = useState(false);

  const [savedOrders, setSavedOrders] = useState([]);
  const [loadedOrderKey, setLoadedOrderKey] = useState("");
  const [saveLabel, setSaveLabel] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [storageReady, setStorageReady] = useState(false);

  // Real product variants from Aeros Products Master. Shape:
  //   { [wallType]: { [size]: [{ td, bd, h, sku, productName, variant, casePack, cartonDimensions }] } }
  // Dimensions, box size, and case pack are all auto-filled from here —
  // free-text dim inputs have been removed.
  const [productDims, setProductDims] = useState({});

  useEffect(() => {
    setSavedOrders(loadSavedOrders(scope));
    setStorageReady(true);
  }, [scope]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/calc/cup-products")
      .then((r) => (r.ok ? r.json() : {}))
      .then((data) => { if (!cancelled && data && !data.error) setProductDims(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const preset = cupVariant ? CUP_PRESETS[cupVariant] : null;
  const cupType = preset ? preset.wallType : "";
  const isDW = cupType === "Double Wall" || cupType === "Ripple";

  // Variants from DB for the currently picked cup type + size.
  const productVariants = cupType && size ? (productDims[cupType]?.[size] || []) : [];
  const selectedProduct = useMemo(
    () => productVariants.find((v) => v.sku === sku) || null,
    [productVariants, sku]
  );

  // Pick a product variant → stamp SKU, dims, case pack, carton box on the form.
  function applyProductVariant(product) {
    if (!product) return;
    setSku(product.sku || "");
    setTd(String(product.td || ""));
    setBd(String(product.bd || ""));
    setH(String(product.h || ""));
    if (product.casePack) setCasePack(String(product.casePack));
    // Carton Dimensions format: "415 × 330 × 500" (L × W × H in mm)
    if (product.cartonDimensions) {
      const parts = product.cartonDimensions.split(/[×x*]/).map((p) => p.trim().replace(/[^0-9.]/g, ""));
      if (parts[0]) setBoxL(parts[0]);
      if (parts[1]) setBoxW(parts[1]);
      if (parts[2]) setBoxH(parts[2]);
    }
  }

  // When variants load or wall/size changes, auto-pick the first variant
  // unless an existing sku still matches.
  useEffect(() => {
    if (!cupType || !size) return;
    if (productVariants.length === 0) return;
    if (!productVariants.find((v) => v.sku === sku)) {
      applyProductVariant(productVariants[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productDims, cupType, size]);

  function applyPreset(variant, sz) {
    const p = CUP_PRESETS[variant];
    if (!p || !sz) return;
    const sw = p.sw[sz], bt = p.bt[sz], of = p.of?.[sz];
    if (sw) { setSwGSM(String(sw.gsm)); setSwCoating(sw.coating); }
    if (bt) { setBtGSM(String(bt.gsm)); setBtCoating(bt.coating); }
    if (of) { setOfGSM(String(of.gsm)); setOfCoating(of.coating); }
    else { setOfGSM(""); setOfCoating("None"); }
    // SKU, dims and box size are NOT filled from the preset — they come from
    // Products Master via the Variant dropdown (see applyProductVariant).
    const cp = CASE_PACK_DEFAULTS[p.wallType]?.[sz];
    if (cp) setCasePack(String(cp));
    const pp = PACKING_PRESETS[variant]?.[sz];
    if (pp) {
      setPackPoly(pp.poly !== "" ? String(pp.poly) : "");
      setPackCarton(pp.carton !== "" ? String(pp.carton) : "");
    }
    setPresetLocked(true);
    setResult(null);
  }

  function loadOrder(key) {
    const order = savedOrders.find((o) => o.key === key);
    if (!order) return;
    const d = order.data;
    setCupVariant(d.cupVariant || "");
    setSize(d.size || "");
    setSku(d.sku || "");
    setQty(d.qty || "");
    setCasePack(d.casePack || "");
    setMargin(d.margin || "");
    setTd(d.td || ""); setBd(d.bd || ""); setH(d.h || "");
    setBoxL(d.boxL || ""); setBoxW(d.boxW || ""); setBoxH(d.boxH || "");
    if (!d.boxL && (d.cupVariant === "DW Export" || d.cupVariant === "DW Standard") && d.size === "20oz") {
      setBoxL("450"); setBoxW("370"); setBoxH("650");
    }
    setSwGSM(d.swGSM || ""); setSwRate(d.swRate || "");
    setSwCoating(d.swCoating || "None"); setSwCoatingRate(d.swCoatingRate || "");
    setSwPrint(d.swPrint || "No printing"); setSwColors(d.swColors || "");
    setSwRate1(d.swRate1 || ""); setSwRateN(d.swRateN || "");
    setBtGSM(d.btGSM || ""); setBtRate(d.btRate || "");
    setBtCoating(d.btCoating || "None"); setBtCoatingRate(d.btCoatingRate || "");
    setConv(d.conv || ""); setPack(d.pack || "");
    setGlue(d.glue || ""); setOtherCost(d.otherCost || "");
    setConvSalary(d.convSalary || "185000");
    setConvElec(d.convElec || "100000");
    setConvRent(d.convRent || "112500");
    setPackPoly(d.packPoly || ""); setPackCarton(d.packCarton || "");
    setOfGSM(d.ofGSM || ""); setOfRate(d.ofRate || "");
    setOfCoating(d.ofCoating || "None"); setOfCoatingRate(d.ofCoatingRate || "");
    setOfPrint(d.ofPrint || "No printing"); setOfColors(d.ofColors || "");
    setOfRate1(d.ofRate1 || ""); setOfRateN(d.ofRateN || "");
    setLoadedOrderKey(key);
    setResult(null);
    setPresetLocked(false);
  }

  function saveOrder() {
    if (!saveLabel.trim()) return;
    const key = `${STORAGE_PREFIX}${scope}:${Date.now()}`;
    const snapshot = getFormSnapshot({
      cupVariant, size, sku, qty, casePack, margin, td, bd, h, boxL, boxW, boxH,
      swGSM, swRate, swCoating, swCoatingRate, swPrint, swColors, swRate1, swRateN,
      btGSM, btRate, btCoating, btCoatingRate, conv, pack, glue, otherCost,
      convSalary, convElec, convRent, packPoly, packCarton,
      ofGSM, ofRate, ofCoating, ofCoatingRate, ofPrint, ofColors, ofRate1, ofRateN,
    });
    const payload = { label: saveLabel.trim(), data: snapshot };
    try {
      localStorage.setItem(key, JSON.stringify(payload));
      setSavedOrders((prev) => [...prev, { key, ...payload }]);
      setLoadedOrderKey(key);
      setSaveLabel("");
      setShowSaveInput(false);
    } catch (e) {
      alert("Save failed: " + e.message);
    }
  }

  function deleteOrder(key) {
    try {
      localStorage.removeItem(key);
      setSavedOrders((prev) => prev.filter((o) => o.key !== key));
      if (loadedOrderKey === key) setLoadedOrderKey("");
    } catch {}
  }

  const swDims = getSidewallDims(size, swPrint);
  const ofDims = size && OF_DIMS[size] ? OF_DIMS[size] : null;
  const ofFans = getOuterFanCount(size);

  function runCalculate() {
    const r = calculate({
      wallType: cupType,
      size, casePack, margin,
      swGSM, swRate, swCoating, swCoatingRate,
      swPrint, swColors, swRate1, swRateN,
      btGSM, btRate, btCoating, btCoatingRate,
      ofGSM, ofRate, ofCoating, ofCoatingRate,
      ofPrint, ofColors, ofRate1, ofRateN,
      conv, pack, glue, otherCost,
    });
    setResult(r);
  }

  const f4 = (n) => `₹${(n || 0).toFixed(4)}`;
  const f2 = (n) => `₹${(n || 0).toFixed(2)}`;
  const swSpec = preset && size ? preset.sw[size] : null;
  const btSpec = preset && size ? preset.bt[size] : null;
  const ofSpec = preset && size && preset.of ? preset.of[size] : null;
  const loadedOrder = savedOrders.find((o) => o.key === loadedOrderKey);

  return (
    <div className="cup-app">
      <style>{css}</style>

      {storageReady && (
        <div className="card">
          <div className="card-title">Saved orders</div>
          <div className="field-row" style={{ alignItems: "flex-end" }}>
            <Field label="Load a saved order">
              <select value={loadedOrderKey} onChange={(e) => loadOrder(e.target.value)}>
                <option value="">Select saved order…</option>
                {savedOrders.map((o) => (
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
              </select>
            </Field>
            {loadedOrderKey && (
              <div style={{ paddingBottom: 2 }}>
                <button className="del-btn" onClick={() => deleteOrder(loadedOrderKey)}>🗑 Delete</button>
              </div>
            )}
          </div>
          {loadedOrder && (
            <div className="saved-order-tag" style={{ marginBottom: ".5rem" }}>
              📋 Loaded: {loadedOrder.label}
            </div>
          )}
          {!showSaveInput ? (
            <button onClick={() => setShowSaveInput(true)} className="ghost-btn">
              + Save current as new order
            </button>
          ) : (
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <input
                type="text"
                value={saveLabel}
                onChange={(e) => setSaveLabel(e.target.value)}
                placeholder="e.g. 8oz SW – Wellbeing's Israel"
                className="save-input"
                onKeyDown={(e) => e.key === "Enter" && saveOrder()}
              />
              <button className="apply-btn" onClick={saveOrder}>Save</button>
              <button
                onClick={() => { setShowSaveInput(false); setSaveLabel(""); }}
                className="ghost-btn"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      <div className="card">
        <div className="card-title">Basics</div>
        <div className="field-row">
          <Field label="Cup type">
            <select
              value={cupVariant}
              onChange={(e) => { setCupVariant(e.target.value); setSize(""); setResult(null); setPresetLocked(false); }}
            >
              <option value="">Select type…</option>
              <option value="SW Standard">Single Wall</option>
              <option value="DW Standard">Double Wall</option>
              <option value="Ripple Standard">Ripple Wall</option>
            </select>
          </Field>
          <Field label="Cup size">
            <div className="chips" style={{ marginTop: 2 }}>
              {SIZE_OPTS.map((o) => (
                <Chip
                  key={o}
                  label={o}
                  selected={size === o}
                  onClick={() => {
                    setSize(o);
                    if (cupVariant) applyPreset(cupVariant, o);
                    const isDWType = CUP_PRESETS[cupVariant]?.wallType === "Double Wall";
                    if (o === "20oz" && isDWType) { setBoxL("450"); setBoxW("370"); setBoxH("650"); }
                    else { setBoxL(""); setBoxW(""); setBoxH(""); }
                  }}
                />
              ))}
            </div>
          </Field>
        </div>
        {preset && size && (
          <div className="spec-row">
            <div className="spec-cell">
              <div className="sc-label">Sidewall</div>
              <div className="sc-val">{swSpec?.gsm}+{swSpec?.coating}</div>
            </div>
            <div className="spec-cell">
              <div className="sc-label">Bottom</div>
              <div className="sc-val">{btSpec?.gsm}+{btSpec?.coating}</div>
            </div>
            {ofSpec && (
              <div className="spec-cell">
                <div className="sc-label">Outer fan</div>
                <div className="sc-val">{ofSpec?.gsm}+{ofSpec?.coating}</div>
              </div>
            )}
          </div>
        )}
        {productVariants.length > 0 && (
          <div className="field-row">
            <Field label={productVariants.length > 1 ? "Variant (pick dimensions)" : "Product"}>
              <select
                value={sku}
                onChange={(e) => {
                  const v = productVariants.find((p) => p.sku === e.target.value);
                  if (v) applyProductVariant(v);
                }}
              >
                {productVariants.map((v) => (
                  <option key={v.sku} value={v.sku}>
                    {v.variant} — {v.td}×{v.bd}×{v.h} mm · {v.sku}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}
        {productVariants.length === 0 && cupType && size && (
          <div className="autofill" style={{ marginBottom: ".75rem", color: "var(--text-secondary)" }}>
            No SKU in Aeros Products Master for {size} {cupType}. Add one to proceed.
          </div>
        )}
        {(td || bd || h) && (
          <div className="spec-row" style={{ marginBottom: ".75rem" }}>
            <div className="spec-cell">
              <div className="sc-label">Top dia</div>
              <div className="sc-val">{td ? `${td} mm` : "—"}</div>
            </div>
            <div className="spec-cell">
              <div className="sc-label">Bottom dia</div>
              <div className="sc-val">{bd ? `${bd} mm` : "—"}</div>
            </div>
            <div className="spec-cell">
              <div className="sc-label">Height</div>
              <div className="sc-val">{h ? `${h} mm` : "—"}</div>
            </div>
          </div>
        )}
        {(boxL || boxW || boxH) && (
          <div className="spec-row" style={{ marginBottom: ".75rem" }}>
            <div className="spec-cell">
              <div className="sc-label">Box L</div>
              <div className="sc-val">{boxL ? `${boxL} mm` : "—"}</div>
            </div>
            <div className="spec-cell">
              <div className="sc-label">Box W</div>
              <div className="sc-val">{boxW ? `${boxW} mm` : "—"}</div>
            </div>
            <div className="spec-cell">
              <div className="sc-label">Box H</div>
              <div className="sc-val">{boxH ? `${boxH} mm` : "—"}</div>
            </div>
          </div>
        )}
        {sku && (
          <div className="autofill" style={{ marginBottom: ".75rem" }}>
            SKU · {sku}{selectedProduct?.productName ? ` — ${selectedProduct.productName}` : ""}
          </div>
        )}
        <div className="field-row">
          <Field label="Order quantity (cups)">
            <NumInput value={qty} onChange={setQty} placeholder="e.g. 50000" />
          </Field>
          <Field label="Case pack" note={casePack && size && cupType ? `Auto-filled: ${cupType} ${size}` : ""}>
            <NumInput value={casePack} onChange={setCasePack} placeholder="e.g. 1000" />
          </Field>
          <Field label="Factory margin %">
            <NumInput value={margin} onChange={setMargin} placeholder="e.g. 15" />
          </Field>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Inner wall</div>
        <div className="field-row">
          <Field label="Sidewall GSM" badge={presetLocked && swSpec ? `Preset: ${swSpec.gsm}` : ""}>
            <NumInput value={swGSM} onChange={setSwGSM} placeholder="e.g. 280" />
          </Field>
          <Field
            label="Sidewall paper rate (₹/kg)"
            note={
              swDims && swPrint !== "No printing"
                ? `Dims: ${swDims[0]}×${swDims[1]}mm · 6 fans`
                : swDims
                ? `Dims: ${swDims[0]}×${swDims[1]}mm`
                : ""
            }
          >
            <NumInput value={swRate} onChange={setSwRate} placeholder="e.g. 95" />
          </Field>
        </div>
        <CoatingSection
          coating={swCoating} setCoating={setSwCoating}
          coatingRate={swCoatingRate} setCoatingRate={setSwCoatingRate}
        />
        <div className="sect-divider">Printing</div>
        <PrintSection
          print={swPrint} setPrint={setSwPrint}
          colors={swColors} setColors={setSwColors}
          rate1={swRate1} setRate1={setSwRate1}
          rateN={swRateN} setRateN={setSwRateN}
        />
      </div>

      <div className="card">
        <div className="card-title">Bottom disc</div>
        <div className="field-row">
          <Field label="Bottom GSM" badge={presetLocked && btSpec ? `Preset: ${btSpec.gsm}` : ""}>
            <NumInput value={btGSM} onChange={setBtGSM} placeholder="e.g. 220" />
          </Field>
          <Field label="Bottom RM rate (₹/kg)" note="Roll width: 75mm (fixed)">
            <NumInput value={btRate} onChange={setBtRate} placeholder="e.g. 90" />
          </Field>
        </div>
        <CoatingSection
          coating={btCoating} setCoating={setBtCoating}
          coatingRate={btCoatingRate} setCoatingRate={setBtCoatingRate}
        />
      </div>

      <div className="card">
        <div className="card-title">Conversion &amp; packing</div>

        <div className="soft-note">
          <button className="expander-btn" onClick={() => setShowConvCalc((v) => !v)}>
            <span style={{ fontSize: 12, fontWeight: 500 }}>Calculate conversion cost</span>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {showConvCalc ? "▲ hide" : "▼ expand"}
            </span>
          </button>
          {showConvCalc && (() => {
            const total = (parseFloat(convSalary) || 0) + (parseFloat(convElec) || 0) + (parseFloat(convRent) || 0);
            const perCup = total / MONTHLY_CAPACITY;
            return (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 8, lineHeight: 1.7 }}>
                  Capacity: 60 cups/min × 720 min × 25 days = <strong>10,80,000 cups/month</strong><br />
                  Salary: 2 ops × ₹70k + 3 labour × ₹15k = ₹1,85,000 · Rent: 7,500 sq ft × ₹15 = ₹1,12,500 · Electricity: ~₹1,00,000 (Torrent Power)
                </div>
                <div className="two-col" style={{ marginBottom: 8 }}>
                  <Field label="Monthly salary (₹)" note="2 ops × ₹70k + 3 labour × ₹15k">
                    <NumInput value={convSalary} onChange={setConvSalary} placeholder="185000" />
                  </Field>
                  <Field label="Monthly electricity (₹)" note="Torrent Power, Bhiwandi">
                    <NumInput value={convElec} onChange={setConvElec} placeholder="100000" />
                  </Field>
                  <Field label="Monthly rent (₹)" note="7,500 sq ft × ₹15/sq ft">
                    <NumInput value={convRent} onChange={setConvRent} placeholder="112500" />
                  </Field>
                </div>
                {total > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "0.5px solid var(--border-tertiary)", paddingTop: 8 }}>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                      ₹{total.toLocaleString()} ÷ 10,80,000 cups
                    </span>
                    <button className="apply-btn" onClick={() => setConv(perCup.toFixed(4))}>
                      Apply ₹{perCup.toFixed(4)}/cup →
                    </button>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        <div className="soft-note">
          <button className="expander-btn" onClick={() => setShowPackCalc((v) => !v)}>
            <span style={{ fontSize: 12, fontWeight: 500 }}>Calculate packing cost</span>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {showPackCalc ? "▲ hide" : "▼ expand"}
            </span>
          </button>
          {showPackCalc && (() => {
            const cp = parseInt(casePack) || 1;
            const polyPerCup = (parseFloat(packPoly) || 0) / cp;
            const cartonPerCup = (parseFloat(packCarton) || 0) / cp;
            const totalPerCup = polyPerCup + cartonPerCup + PACK_LABOUR_PER_CUP;
            return (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 8 }}>
                  Packing labour: ₹30,000/month ÷ 10,80,000 = <strong>₹{PACK_LABOUR_PER_CUP.toFixed(4)}/cup</strong> (fixed)
                </div>
                <div className="two-col" style={{ marginBottom: 8 }}>
                  <Field
                    label="Poly cost (₹/carton)"
                    note={casePack ? `Case: ${casePack} cups${polyPerCup > 0 ? " · ₹" + polyPerCup.toFixed(4) + "/cup" : ""}` : ""}
                  >
                    <NumInput value={packPoly} onChange={setPackPoly} placeholder="e.g. 1.23" step="0.01" />
                  </Field>
                  <Field
                    label="Carton cost (₹/carton)"
                    note={casePack ? `Case: ${casePack} cups${cartonPerCup > 0 ? " · ₹" + cartonPerCup.toFixed(4) + "/cup" : ""}` : ""}
                  >
                    <NumInput value={packCarton} onChange={setPackCarton} placeholder="e.g. 70" step="0.01" />
                  </Field>
                </div>
                {(parseFloat(packPoly) || parseFloat(packCarton)) ? (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "0.5px solid var(--border-tertiary)", paddingTop: 8 }}>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                      Poly + Carton + Labour = ₹{totalPerCup.toFixed(4)}/cup
                    </span>
                    <button className="apply-btn" onClick={() => setPack(totalPerCup.toFixed(4))}>
                      Apply ₹{totalPerCup.toFixed(4)}/cup →
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })()}
        </div>

        <div className="two-col">
          <Field label="Conversion cost (₹/cup)">
            <NumInput value={conv} onChange={setConv} placeholder="e.g. 0.3680" step="0.0001" />
          </Field>
          <Field label="Packing cost (₹/cup)">
            <NumInput value={pack} onChange={setPack} placeholder="e.g. 0.10" step="0.0001" />
          </Field>
          <Field label="Glue cost (₹/cup)">
            <NumInput value={glue} onChange={setGlue} placeholder="e.g. 0.05" step="0.01" />
          </Field>
          <Field label="Other cost (₹/cup)">
            <NumInput value={otherCost} onChange={setOtherCost} placeholder="e.g. 0.00" step="0.01" />
          </Field>
        </div>
      </div>

      {isDW && (
        <div className="card">
          <div className="card-title">Outer wall</div>
          <div className="field-row">
            <Field label="Outer fan GSM" badge={presetLocked && ofSpec ? `Preset: ${ofSpec.gsm}` : ""}>
              <NumInput value={ofGSM} onChange={setOfGSM} placeholder="e.g. 260" />
            </Field>
            <Field
              label="Outer fan paper rate (₹/kg)"
              note={ofDims && size ? `Dims: ${ofDims[0]}×${ofDims[1]}mm · ${ofFans} fans` : ""}
            >
              <NumInput value={ofRate} onChange={setOfRate} placeholder="e.g. 85" />
            </Field>
          </div>
          <CoatingSection
            coating={ofCoating} setCoating={setOfCoating}
            coatingRate={ofCoatingRate} setCoatingRate={setOfCoatingRate}
          />
          <div className="sect-divider">Printing</div>
          <PrintSection
            print={ofPrint} setPrint={setOfPrint}
            colors={ofColors} setColors={setOfColors}
            rate1={ofRate1} setRate1={setOfRate1}
            rateN={ofRateN} setRateN={setOfRateN}
          />
        </div>
      )}

      <button className="calc-btn" onClick={runCalculate}>Calculate rate</button>
      {result && (
        <button className="reset-btn" onClick={() => setResult(null)}>Clear result</button>
      )}

      {result && (
        <div className="result-card">
          <div style={{ padding: "1rem 1.25rem", borderBottom: "0.5px solid var(--border-tertiary)" }}>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 2 }}>
              {sku || "—"} · {size} {cupVariant} · Qty {qty ? parseInt(qty).toLocaleString() : "—"}
              {td && bd && h ? ` · Cup: ${td}×${bd}×${h}mm` : ""}
              {boxL && boxW && boxH ? ` · Box: ${boxL}×${boxW}×${boxH}mm` : ""}
            </div>
            <div className="sp-highlight">
              <div>
                <div className="sp-label">Factory SP / cup</div>
                <div className="sp-val">{f2(result.sp)}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="sp-label">SP per case ({casePack || "—"} cups)</div>
                <div style={{ fontSize: 16, fontWeight: 500, color: "var(--accent-dark)" }}>{f2(result.spCase)}</div>
              </div>
            </div>
            <div className="weight-box">
              <div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 2 }}>
                  Cup weight <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>(corr. factor 0.908)</span>
                </div>
                <div style={{ fontSize: 20, fontWeight: 500 }}>{result.cupWeightG.toFixed(2)} g</div>
              </div>
              <div style={{ textAlign: "right", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.8 }}>
                <div>Sidewall: {result.swWeightG.toFixed(2)} g</div>
                <div>Bottom: {result.btWeightG.toFixed(2)} g</div>
                {isDW && <div>Outer fan: {result.ofWeightG.toFixed(2)} g</div>}
              </div>
            </div>
          </div>
          <div style={{ padding: "0 1.25rem" }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: ".06em", padding: ".75rem 0 .25rem" }}>
              Cost breakdown / cup
            </div>
            {[
              ["Sidewall RM", result.swRM],
              ["Sidewall print", result.swPrintCost],
              ...(isDW ? [["Outer fan (RM + print)", result.ofTotal]] : []),
              ["Bottom disc", result.btCost],
              ["Conversion", result.conv],
              ["Packing", result.pack],
              ["Glue", result.glue],
              ["Other", result.other],
            ].map(([lbl, val]) => (
              <div className="breakdown-row" key={lbl}>
                <span className="lbl">{lbl}</span>
                <span className="val">{f4(val)}</span>
              </div>
            ))}
            <div className="breakdown-row total">
              <span className="lbl">Mfg cost / cup</span>
              <span className="val">{f4(result.mfg)}</span>
            </div>
            <div className="breakdown-row margin-row">
              <span className="lbl">Factory margin ({result.mp}%)</span>
              <span className="val">{f4(result.marginAmt)}</span>
            </div>
            <div className="breakdown-row total" style={{ marginBottom: ".75rem" }}>
              <span className="lbl" style={{ color: "var(--accent-dark)" }}>Factory SP / cup</span>
              <span className="val" style={{ color: "var(--accent-dark)" }}>{f2(result.sp)}</span>
            </div>
          </div>
          {(result.swPlate || result.swDie || result.ofPlate || result.ofDie) && (
            <div className="memo-box">
              <div className="memo-title">One-time costs — bill separately</div>
              {result.swPlate > 0 && <div>Sidewall Flexo plates: ₹{result.swPlate.toLocaleString()}</div>}
              {result.swDie > 0 && <div>Sidewall Offset dies: ₹{result.swDie.toLocaleString()}</div>}
              {result.ofPlate > 0 && <div>Outer fan Flexo plates: ₹{result.ofPlate.toLocaleString()}</div>}
              {result.ofDie > 0 && <div>Outer fan Offset dies: ₹{result.ofDie.toLocaleString()}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
