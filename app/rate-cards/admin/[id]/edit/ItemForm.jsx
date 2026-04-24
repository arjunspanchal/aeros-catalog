"use client";
// Structured editor for a rate-card line item.
//
// Flow:
//   1. Admin picks an SKU from the Aeros Products Master. Pick auto-fills
//      every display spec from the master row (product name, material,
//      dimension, carton, case pack).
//   2. Admin overlays per-card details (brand, plain/printed, MOQ, notes).
//   3. Admin types per-tier rates. Pricing is always fixed — rate cards are
//      a curated price sheet, not a live calculator.

import { useEffect, useMemo, useState } from "react";
import { Field, inputCls } from "@/app/calculator/_components/ui";

function normaliseTiers(raw) {
  // Accept either `[30000, 50000]` or `[{qty, rate}, ...]`.
  if (!Array.isArray(raw)) return [];
  return raw.map((t) => (typeof t === "number" ? { qty: t, rate: "" } : { qty: Number(t.qty) || 0, rate: t.rate ?? "" }));
}

// Stable display string for a Paper RM row so the same pick round-trips
// between the select's value and the stored `material` text.
function materialLabel(m) {
  if (!m) return "";
  const parts = [m.materialName];
  if (m.gsm) parts.push(`${m.gsm} gsm`);
  if (m.millCoating) parts.push(m.millCoating);
  return parts.filter(Boolean).join(" · ");
}

// Heuristic: match a master product's GSM + Material to a Paper RM row so we
// can auto-fill the Material picker on product pick. Returns the RM display
// label or "" if no confident match.
function guessMaterialFromProduct(p, materials) {
  if (!p || !Array.isArray(materials) || materials.length === 0) return "";
  const targetGsm = typeof p.gsm === "number" ? p.gsm : null;
  const targetMat = (p.material || "").toLowerCase().trim();
  if (!targetGsm && !targetMat) return "";
  // Prefer exact GSM + name substring match.
  const hit = materials.find((m) => {
    const gsmOk = targetGsm ? m.gsm === targetGsm : true;
    const nameOk = targetMat ? (m.materialName || "").toLowerCase().includes(targetMat) || targetMat.includes((m.materialName || "").toLowerCase()) : true;
    return gsmOk && nameOk;
  });
  return hit ? materialLabel(hit) : "";
}

export default function ItemForm({ initial, submitLabel, onSubmit, onCancel }) {
  const [products, setProducts] = useState(null); // null = loading
  const [productQuery, setProductQuery] = useState("");
  const [materials, setMaterials] = useState(null);
  const [materialQuery, setMaterialQuery] = useState("");
  const [materialFreeText, setMaterialFreeText] = useState(false);
  const [f, setF] = useState({
    section: initial.section || "",
    sortOrder: initial.sortOrder || 0,
    productId: initial.productId || "",
    productSku: initial.productSku || "",
    productName: initial.productName || "",
    brand: initial.brand || "",
    printing: initial.printing || "",
    material: initial.material || "",
    dimension: initial.dimension || "",
    cartonSize: initial.cartonSize || "",
    casePack: initial.casePack || "",
    moq: initial.moq || "",
    notes: initial.notes || "",
  });
  const [tiers, setTiers] = useState(() => {
    const base = initial.fixedRates?.length
      ? initial.fixedRates
      : normaliseTiers(initial.tierQtys);
    return base.length ? base : [{ qty: 30000, rate: "" }];
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/rate-cards/products")
      .then((r) => r.ok ? r.json() : [])
      .then((list) => setProducts(Array.isArray(list) ? list : []))
      .catch(() => setProducts([]));
    fetch("/api/rate-cards/materials")
      .then((r) => r.ok ? r.json() : [])
      .then((list) => setMaterials(Array.isArray(list) ? list : []))
      .catch(() => setMaterials([]));
  }, []);

  const filteredProducts = useMemo(() => {
    const list = products || [];
    const q = productQuery.trim().toLowerCase();
    if (!q) return list.slice(0, 200);
    return list
      .filter((p) => `${p.productName} ${p.sku} ${p.category} ${p.sizeVolume} ${p.material}`.toLowerCase().includes(q))
      .slice(0, 200);
  }, [products, productQuery]);

  const filteredMaterials = useMemo(() => {
    const list = materials || [];
    const q = materialQuery.trim().toLowerCase();
    if (!q) return list.slice(0, 200);
    return list
      .filter((m) => `${m.materialName} ${m.gsm ?? ""} ${m.type ?? ""} ${m.supplier ?? ""} ${m.millCoating ?? ""}`.toLowerCase().includes(q))
      .slice(0, 200);
  }, [materials, materialQuery]);

  const materialMatchesRM = useMemo(() => {
    if (!f?.material) return true;
    return (materials || []).some((m) => materialLabel(m) === f.material);
  }, [materials, f?.material]);

  function onPickMaterial(value) {
    if (value === "__free__") { setMaterialFreeText(true); return; }
    setMaterialFreeText(false);
    const m = (materials || []).find((x) => materialLabel(x) === value);
    setF((d) => ({ ...d, material: m ? materialLabel(m) : value }));
  }

  // On product pick: ALWAYS overwrite the spec fields from the master so admin
  // sees a clean SKU snapshot. They can still edit any field after if a card-
  // specific tweak is needed.
  function onPickProduct(id) {
    const p = (products || []).find((x) => x.id === id);
    if (!p) {
      setF((d) => ({ ...d, productId: "", productSku: "" }));
      return;
    }
    const guessedMaterial = guessMaterialFromProduct(p, materials || []);
    // Build a dimension string from the master's TD/BD/H if the size field
    // doesn't already include "x"-style dimensions.
    const dimensionFromMaster = p.cartonDimensions || p.sizeVolume || "";
    setF((d) => ({
      ...d,
      productId: p.id,
      productSku: p.sku || "",
      productName: p.productName || "",
      // RM-resolved material when we can guess; raw master.material as fallback.
      material: guessedMaterial || p.material || "",
      dimension: p.sizeVolume || d.dimension,
      cartonSize: p.cartonDimensions || "",
      casePack: p.unitsPerCase != null ? String(p.unitsPerCase) : "",
    }));
    // If guessed material doesn't match any RM row, surface the free-text mode.
    if (!guessedMaterial && p.material) setMaterialFreeText(true);
  }

  const set = (k, v) => setF((d) => ({ ...d, [k]: v }));

  function setTierQty(idx, qty) {
    setTiers((t) => t.map((row, i) => i === idx ? { ...row, qty: Number(qty) || 0 } : row));
  }
  function setTierRate(idx, rate) {
    setTiers((t) => t.map((row, i) => i === idx ? { ...row, rate } : row));
  }
  function addTier() { setTiers((t) => [...t, { qty: 0, rate: "" }]); }
  function removeTier(idx) { setTiers((t) => t.filter((_, i) => i !== idx)); }

  async function submit(e) {
    e.preventDefault();
    setErr("");
    if (!f.productId) { setErr("Pick a product from the Aeros master catalogue."); return; }
    if (!f.productName) { setErr("Product name is required."); return; }

    const validTiers = tiers.filter((t) => Number(t.qty) > 0);
    if (validTiers.length === 0) { setErr("Add at least one quantity tier."); return; }

    const payload = {
      section: f.section,
      sortOrder: Number(f.sortOrder) || 0,
      productId: f.productId,
      productSku: f.productSku,
      productName: f.productName,
      brand: f.brand,
      printing: f.printing,
      material: f.material,
      dimension: f.dimension,
      cartonSize: f.cartonSize,
      casePack: f.casePack ? Number(f.casePack) : null,
      moq: f.moq,
      // Always fixed — cup_formula was retired; rate cards are curated price
      // sheets. Old rows on the table may still carry "cup_formula" but new
      // writes always set "fixed".
      pricingMode: "fixed",
      cupSpec: null,
      tierQtys: validTiers.map((t) => Number(t.qty)),
      fixedRates: validTiers.map((t) => ({ qty: Number(t.qty), rate: Number(t.rate) || 0 })),
      notes: f.notes,
    };

    setSaving(true);
    const ok = await onSubmit(payload);
    setSaving(false);
    if (ok === false) return;
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* 1 — Product picker (Aeros Products Master) */}
      <div className="border border-gray-200 rounded-lg p-3 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Product from Aeros master <span className="text-red-500">*</span>
          </div>
          <div className="text-[11px] text-gray-400 dark:text-gray-500">
            {products === null ? "Loading catalogue…" : `${products.length} products`}
          </div>
        </div>
        <input
          className={`${inputCls} mb-2`}
          placeholder="Search by name / SKU / size / material…"
          value={productQuery}
          onChange={(e) => setProductQuery(e.target.value)}
        />
        <select
          required
          className={inputCls}
          value={f.productId}
          onChange={(e) => onPickProduct(e.target.value)}
        >
          <option value="">— Select a master product —</option>
          {filteredProducts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.productName}{p.sku ? ` (${p.sku})` : ""}{p.sizeVolume ? ` · ${p.sizeVolume}` : ""}
            </option>
          ))}
        </select>
        {products !== null && products.length === 0 && (
          <p className="mt-2 text-xs text-red-500">
            No master products loaded. Check <code>CATALOG_BASE_ID</code> / <code>CATALOG_TABLE_ID</code> env vars.
          </p>
        )}
        {f.productSku && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            SKU: <strong>{f.productSku}</strong> — auto-filled from master. Edit any field below to override for this card.
          </p>
        )}
      </div>

      {/* 2 — Brand / print overlay */}
      <div className="border border-gray-200 rounded-lg p-3 dark:border-gray-700">
        <div className="text-xs font-medium text-gray-500 mb-2 dark:text-gray-400">
          Brand / print overlay
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Brand" hint="Defaults to card brand if blank">
            <input className={inputCls} value={f.brand} onChange={(e) => set("brand", e.target.value)} placeholder="Salt City Coffee" />
          </Field>
          <Field label="Print">
            <select className={inputCls} value={f.printing} onChange={(e) => set("printing", e.target.value)}>
              <option value="">—</option>
              <option value="Plain">Plain</option>
              <option value="Printed">Printed</option>
            </select>
          </Field>
          <Field label="MOQ" hint="e.g. 30k, 50k">
            <input className={inputCls} value={f.moq} onChange={(e) => set("moq", e.target.value)} placeholder="30k" />
          </Field>
        </div>
      </div>

      {/* 3 — Spec fields (auto-filled from master, editable) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Product name *" hint="Auto-filled from master; edit to customise display">
          <input required className={inputCls} value={f.productName} onChange={(e) => set("productName", e.target.value)} />
        </Field>
        <Field label="Section" hint="Group header, e.g. Paper Hot Cups — Printed">
          <input className={inputCls} value={f.section} onChange={(e) => set("section", e.target.value)} />
        </Field>
        <Field
          label="Material"
          hint={
            materials === null
              ? "Loading from Paper RM Master…"
              : materialFreeText || (!materialMatchesRM && f.material)
              ? "Free text — not matched to a Paper RM SKU"
              : `Pick from ${materials.length} Paper RM SKUs, or switch to free text`
          }
        >
          {materialFreeText || (!materialMatchesRM && f.material) ? (
            <div className="flex gap-2">
              <input
                className={inputCls}
                value={f.material}
                onChange={(e) => set("material", e.target.value)}
                placeholder="260 gsm Aqua + 240 gsm (DW)"
              />
              <button
                type="button"
                onClick={() => { setMaterialFreeText(false); set("material", ""); }}
                className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 whitespace-nowrap px-2"
                title="Switch back to Paper RM picker"
              >
                Pick RM →
              </button>
            </div>
          ) : (
            <>
              {materials && materials.length > 0 && (
                <input
                  className={`${inputCls} mb-2`}
                  placeholder="Search Paper RM by name / GSM / supplier…"
                  value={materialQuery}
                  onChange={(e) => setMaterialQuery(e.target.value)}
                />
              )}
              <select
                className={inputCls}
                value={f.material}
                onChange={(e) => onPickMaterial(e.target.value)}
                disabled={!materials}
              >
                <option value="">— Select a Paper RM material —</option>
                {filteredMaterials.map((m) => (
                  <option key={m.id} value={materialLabel(m)}>
                    {materialLabel(m)}{m.supplier ? ` (${m.supplier})` : ""}
                  </option>
                ))}
                <option value="__free__">+ Type custom material…</option>
              </select>
            </>
          )}
        </Field>
        <Field label="Dimension (mm)">
          <input className={inputCls} value={f.dimension} onChange={(e) => set("dimension", e.target.value)} placeholder="90 TD x 60 BD x 85 H" />
        </Field>
        <Field label="Carton size (mm)">
          <input className={inputCls} value={f.cartonSize} onChange={(e) => set("cartonSize", e.target.value)} placeholder="460 x 370 x 500" />
        </Field>
        <Field label="Case pack (pcs)">
          <input type="number" className={inputCls} value={f.casePack} onChange={(e) => set("casePack", e.target.value)} placeholder="500" />
        </Field>
        <Field label="Sort order" hint="Lower shows first in the card">
          <input type="number" className={inputCls} value={f.sortOrder} onChange={(e) => set("sortOrder", e.target.value)} />
        </Field>
      </div>

      {/* Tier qtys + rates */}
      <div className="border border-gray-200 rounded-lg p-3 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Quantity tiers + rates
          </div>
          <button type="button" onClick={addTier} className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400">+ Add tier</button>
        </div>
        <div className="space-y-2">
          {tiers.map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="number" className={`${inputCls} w-40`} placeholder="Qty (e.g. 30000)"
                value={t.qty || ""} onChange={(e) => setTierQty(i, e.target.value)} />
              <span className="text-xs text-gray-400 dark:text-gray-500">@</span>
              <input type="number" step="0.01" className={`${inputCls} w-32`} placeholder="Rate (₹)"
                value={t.rate ?? ""} onChange={(e) => setTierRate(i, e.target.value)} />
              <button type="button" onClick={() => removeTier(i)} className="text-xs text-red-500 hover:text-red-600 px-2">✕</button>
            </div>
          ))}
        </div>
      </div>

      <Field label="Notes">
        <textarea rows={2} className={inputCls} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
      </Field>

      <div className="flex items-center gap-3">
        <button disabled={saving} className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60">
          {saving ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            Cancel
          </button>
        )}
        {err && <p className="text-xs text-red-500">{err}</p>}
      </div>
    </form>
  );
}
