"use client";

import { useMemo, useState } from "react";

// Editor UI for the Product Catalogue. Mirrors the Clearance "Manage" page —
// cards with in-place edit + save, plus a top "New product" form that drops
// the new row at the top of the list on success.

export default function ManageClient({ initialProducts, initialCategories }) {
  const [products, setProducts] = useState(initialProducts);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showNew, setShowNew] = useState(false);

  const categories = useMemo(() => {
    const set = new Set(initialCategories || []);
    products.forEach((p) => p.category && set.add(p.category));
    return Array.from(set).sort();
  }, [products, initialCategories]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (categoryFilter && p.category !== categoryFilter) return false;
      if (!q) return true;
      const hay = `${p.productName} ${p.sku} ${p.category} ${p.subCategory} ${p.material} ${p.sizeVolume} ${p.supplier}`.toLowerCase();
      return hay.includes(q);
    });
  }, [products, search, categoryFilter]);

  function replaceProduct(updated) {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
  }

  function removeProduct(id) {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }

  function prependProduct(p) {
    setProducts((prev) => [p, ...prev]);
  }

  return (
    <div>
      {/* Filters + New button */}
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <input
          type="search"
          placeholder="Search product, SKU, category, material…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[220px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
          {filtered.length} of {products.length} shown
        </div>
        <button
          onClick={() => setShowNew((s) => !s)}
          className="ml-auto rounded-md bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
        >
          {showNew ? "Close" : "+ New product"}
        </button>
      </div>

      {showNew && (
        <NewProductCard
          onCreated={(p) => {
            prependProduct(p);
            setShowNew(false);
          }}
          onCancel={() => setShowNew(false)}
        />
      )}

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
            No products match your filters.
          </div>
        ) : (
          filtered.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              onChange={replaceProduct}
              onDelete={() => removeProduct(product.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ProductRow({ product, onChange, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => toDraft(product));
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState(null);

  function startEdit() {
    setDraft(toDraft(product));
    setEditing(true);
    setError(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/catalog/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Save failed (${res.status})`);
      }
      const { product: updated } = await res.json();
      onChange(updated);
      setEditing(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    const label = product.productName || product.sku || "this product";
    if (!confirm(`Delete "${label}"? This cannot be undone.`)) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/catalog/products/${product.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Delete failed (${res.status})`);
      }
      onDelete();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      {editing ? (
        <EditForm
          draft={draft}
          setDraft={setDraft}
          saving={saving}
          onCancel={() => setEditing(false)}
          onSave={save}
          error={error}
        />
      ) : (
        <ReadView
          product={product}
          onEdit={startEdit}
          onDelete={remove}
          saving={saving}
          savedFlash={savedFlash}
          error={error}
        />
      )}
    </div>
  );
}

function NewProductCard({ onCreated, onCancel }) {
  const [draft, setDraft] = useState(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function save() {
    if (!draft.productName.trim()) {
      setError("Product name is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/catalog/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Create failed (${res.status})`);
      }
      const { product } = await res.json();
      onCreated(product);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-6 rounded-lg border-2 border-brand-500 bg-white p-4 shadow-sm dark:border-brand-400 dark:bg-gray-900">
      <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">New product</h3>
      <EditForm
        draft={draft}
        setDraft={setDraft}
        saving={saving}
        onCancel={onCancel}
        onSave={save}
        error={error}
        saveLabel="Create"
      />
    </div>
  );
}

function toDraft(p) {
  return {
    productName: p.productName || "",
    sku: p.sku || "",
    category: p.category || "",
    subCategory: p.subCategory || "",
    sizeVolume: p.sizeVolume || "",
    colour: p.colour || "",
    material: p.material || "",
    gsm: p.gsm == null ? "" : String(p.gsm),
    wallType: p.wallType || "",
    coating: p.coating || "",
    unitsPerCase: p.unitsPerCase == null ? "" : String(p.unitsPerCase),
    casesPerPallet: p.casesPerPallet == null ? "" : String(p.casesPerPallet),
    pricePerUnit: p.pricePerUnit == null ? "" : String(p.pricePerUnit),
    pricePerCase: p.pricePerCase == null ? "" : String(p.pricePerCase),
    cartonDimensions: p.cartonDimensions || "",
    topDiameter: p.topDiameter == null ? "" : String(p.topDiameter),
    bottomDiameter: p.bottomDiameter == null ? "" : String(p.bottomDiameter),
    heightMm: p.heightMm == null ? "" : String(p.heightMm),
    supplier: p.supplier || "",
    notes: p.notes || "",
  };
}

function emptyDraft() {
  return toDraft({});
}

function formatPrice(v) {
  if (v == null) return null;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(v);
}

function ReadView({ product, onEdit, onDelete, saving, savedFlash, error }) {
  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-gray-900 dark:text-gray-100">
            {product.productName || <span className="text-gray-400 dark:text-gray-500">(no name)</span>}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            {product.sku && <span className="font-mono">{product.sku}</span>}
            {product.category && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 dark:bg-gray-800 dark:text-gray-300">
                {product.category}
              </span>
            )}
            {product.subCategory && <span>{product.subCategory}</span>}
            {product.sizeVolume && <span>{product.sizeVolume}</span>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {savedFlash && (
            <span className="text-xs font-medium text-green-600 dark:text-green-400">Saved</span>
          )}
          <button
            onClick={onEdit}
            disabled={saving}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            disabled={saving}
            className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/60 dark:bg-gray-800 dark:text-red-300 dark:hover:bg-red-950/40"
          >
            Delete
          </button>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4 lg:grid-cols-6">
        <KV label="Price / unit">
          {product.pricePerUnit != null
            ? formatPrice(product.pricePerUnit)
            : <span className="italic text-gray-500 dark:text-gray-400">Pending</span>}
        </KV>
        <KV label="Price / case">
          {product.pricePerCase != null ? formatPrice(product.pricePerCase) : <span className="text-gray-400 dark:text-gray-500">—</span>}
        </KV>
        <KV label="Units / case">
          {product.unitsPerCase != null ? product.unitsPerCase.toLocaleString() : <span className="text-gray-400 dark:text-gray-500">—</span>}
        </KV>
        <KV label="Cases / pallet">
          {product.casesPerPallet != null ? product.casesPerPallet.toLocaleString() : <span className="text-gray-400 dark:text-gray-500">—</span>}
        </KV>
        <KV label="Material">{product.material || <span className="text-gray-400 dark:text-gray-500">—</span>}</KV>
        <KV label="GSM">
          {product.gsm != null ? product.gsm : <span className="text-gray-400 dark:text-gray-500">—</span>}
        </KV>
        <KV label="Wall type">{product.wallType || <span className="text-gray-400 dark:text-gray-500">—</span>}</KV>
        <KV label="Coating">{product.coating || <span className="text-gray-400 dark:text-gray-500">—</span>}</KV>
        <KV label="Colour">{product.colour || <span className="text-gray-400 dark:text-gray-500">—</span>}</KV>
        <KV label="Top Ø">
          {product.topDiameter != null ? `${product.topDiameter} mm` : <span className="text-gray-400 dark:text-gray-500">—</span>}
        </KV>
        <KV label="Bottom Ø">
          {product.bottomDiameter != null ? `${product.bottomDiameter} mm` : <span className="text-gray-400 dark:text-gray-500">—</span>}
        </KV>
        <KV label="Height">
          {product.heightMm != null ? `${product.heightMm} mm` : <span className="text-gray-400 dark:text-gray-500">—</span>}
        </KV>
        <KV label="Carton">{product.cartonDimensions || <span className="text-gray-400 dark:text-gray-500">—</span>}</KV>
        <KV label="Supplier">{product.supplier || <span className="text-gray-400 dark:text-gray-500">—</span>}</KV>
      </dl>

      {product.notes && (
        <p className="mt-3 text-xs text-gray-600 dark:text-gray-300">
          <span className="font-medium text-gray-500 dark:text-gray-400">Notes:</span>{" "}
          {product.notes}
        </p>
      )}

      {error && (
        <p className="mt-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}

function KV({ label, children }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">{label}</dt>
      <dd className="text-gray-700 dark:text-gray-200">{children}</dd>
    </div>
  );
}

function EditForm({ draft, setDraft, saving, onCancel, onSave, error, saveLabel = "Save" }) {
  function set(key, value) {
    setDraft((d) => ({ ...d, [key]: value }));
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Product name *">
          <input value={draft.productName} onChange={(e) => set("productName", e.target.value)} className={inputCls} required />
        </Field>
        <Field label="SKU">
          <input value={draft.sku} onChange={(e) => set("sku", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Category">
          <input value={draft.category} onChange={(e) => set("category", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Sub-category / style">
          <input value={draft.subCategory} onChange={(e) => set("subCategory", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Size / volume">
          <input value={draft.sizeVolume} onChange={(e) => set("sizeVolume", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Colour / print">
          <input value={draft.colour} onChange={(e) => set("colour", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Material">
          <input value={draft.material} onChange={(e) => set("material", e.target.value)} className={inputCls} />
        </Field>
        <Field label="GSM">
          <input type="number" value={draft.gsm} onChange={(e) => set("gsm", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Wall type">
          <input value={draft.wallType} onChange={(e) => set("wallType", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Coating">
          <input value={draft.coating} onChange={(e) => set("coating", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Units per case">
          <input type="number" value={draft.unitsPerCase} onChange={(e) => set("unitsPerCase", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Cases per pallet">
          <input type="number" value={draft.casesPerPallet} onChange={(e) => set("casesPerPallet", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Price per unit (₹)">
          <input type="number" step="0.01" min="0" value={draft.pricePerUnit} onChange={(e) => set("pricePerUnit", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Price per case (₹)">
          <input type="number" step="0.01" min="0" value={draft.pricePerCase} onChange={(e) => set("pricePerCase", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Carton dimensions (mm)">
          <input value={draft.cartonDimensions} onChange={(e) => set("cartonDimensions", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Top Ø (mm)">
          <input type="number" step="0.1" value={draft.topDiameter} onChange={(e) => set("topDiameter", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Bottom Ø (mm)">
          <input type="number" step="0.1" value={draft.bottomDiameter} onChange={(e) => set("bottomDiameter", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Height (mm)">
          <input type="number" step="0.1" value={draft.heightMm} onChange={(e) => set("heightMm", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Supplier / manufacturer">
          <input value={draft.supplier} onChange={(e) => set("supplier", e.target.value)} className={inputCls} />
        </Field>
      </div>
      <Field label="Notes">
        <textarea rows={2} value={draft.notes} onChange={(e) => set("notes", e.target.value)} className={inputCls} />
      </Field>

      {error && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-700 disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
        >
          {saving ? "Saving…" : saveLabel}
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500";

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </span>
      {children}
    </label>
  );
}
