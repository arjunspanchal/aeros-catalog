"use client";

import { useMemo, useRef, useState } from "react";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

export default function ManageClient({ initialItems }) {
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const categories = useMemo(() => {
    const set = new Set();
    items.forEach((i) => i.category && set.add(i.category));
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (categoryFilter && it.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        it.itemName.toLowerCase().includes(q) ||
        it.brand.toLowerCase().includes(q) ||
        it.category.toLowerCase().includes(q)
      );
    });
  }, [items, search, categoryFilter]);

  function updateItemLocally(id, patch) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  return (
    <div>
      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <input
          type="search"
          placeholder="Search item, brand, category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <div className="flex items-center text-xs text-gray-500">
          {filtered.length} of {items.length} shown
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
            No items match your filters.
          </div>
        ) : (
          filtered.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              onChange={(patch) => updateItemLocally(item.id, patch)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ItemRow({ item, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => toDraft(item));
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState(null);

  function startEdit() {
    setDraft(toDraft(item));
    setEditing(true);
    setError(null);
  }

  function cancelEdit() {
    setEditing(false);
    setError(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/clearance/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Save failed (${res.status})`);
      }
      const { item: updated } = await res.json();
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

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 p-4 md:flex-row">
        {/* Photos column */}
        <PhotosColumn item={item} onChange={onChange} />

        {/* Fields column */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <EditForm
              draft={draft}
              setDraft={setDraft}
              saving={saving}
              onCancel={cancelEdit}
              onSave={save}
              error={error}
            />
          ) : (
            <ReadView
              item={item}
              onEdit={startEdit}
              savedFlash={savedFlash}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function toDraft(item) {
  return {
    itemName: item.itemName || "",
    brand: item.brand || "",
    category: item.category || "",
    stockQuantity: item.stockQuantity == null ? "" : String(item.stockQuantity),
    unit: item.unit || "pcs",
    casePack: item.casePack == null ? "" : String(item.casePack),
    status: item.status || "",
    description: item.description || "",
    specifications: item.specifications || "",
    price: item.price == null ? "" : String(item.price),
    showPrice: item.showPrice === true,
  };
}

function formatPrice(p) {
  if (p == null || !Number.isFinite(p)) return null;
  return `₹${p.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function ReadView({ item, onEdit, savedFlash }) {
  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-gray-900">
            {item.itemName || <span className="text-gray-400">(no name)</span>}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
            {item.brand && <span>{item.brand}</span>}
            {item.category && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5">
                {item.category}
              </span>
            )}
            {item.status && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">
                {item.status}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {savedFlash && (
            <span className="text-xs font-medium text-green-600">Saved</span>
          )}
          <button
            onClick={onEdit}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Edit
          </button>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
        <KV label="Stock">
          {item.stockQuantity != null
            ? `${item.stockQuantity.toLocaleString()} ${item.unit || ""}`
            : <span className="text-gray-400">—</span>}
        </KV>
        <KV label="Case pack">
          {item.casePack != null ? item.casePack.toLocaleString() : <span className="text-gray-400">—</span>}
        </KV>
        <KV label="Unit">{item.unit || <span className="text-gray-400">—</span>}</KV>
        <KV label="Status">{item.status || <span className="text-gray-400">—</span>}</KV>
        <KV label="Price">
          {formatPrice(item.price) ? (
            <span>
              {formatPrice(item.price)}
              <span className="ml-1 text-[10px] text-gray-400">/{item.unit || "pcs"}</span>
              {item.showPrice ? (
                <span className="ml-2 rounded-full bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-700">public</span>
              ) : (
                <span className="ml-2 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">hidden</span>
              )}
            </span>
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </KV>
      </dl>

      {(item.description || item.specifications) && (
        <div className="mt-3 space-y-1.5 text-xs text-gray-600">
          {item.description && (
            <p>
              <span className="font-medium text-gray-500">Description:</span>{" "}
              {item.description}
            </p>
          )}
          {item.specifications && (
            <p>
              <span className="font-medium text-gray-500">Specs:</span>{" "}
              {item.specifications}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function KV({ label, children }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="text-gray-700">{children}</dd>
    </div>
  );
}

function EditForm({ draft, setDraft, saving, onCancel, onSave, error }) {
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Item name">
          <input
            value={draft.itemName}
            onChange={(e) => set("itemName", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Brand">
          <input
            value={draft.brand}
            onChange={(e) => set("brand", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Category">
          <input
            value={draft.category}
            onChange={(e) => set("category", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Status">
          <input
            value={draft.status}
            onChange={(e) => set("status", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Stock quantity">
          <input
            type="number"
            value={draft.stockQuantity}
            onChange={(e) => set("stockQuantity", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Unit">
          <input
            value={draft.unit}
            onChange={(e) => set("unit", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Case pack">
          <input
            type="number"
            value={draft.casePack}
            onChange={(e) => set("casePack", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Price (₹ per unit)">
          <input
            type="number"
            step="0.01"
            min="0"
            value={draft.price}
            onChange={(e) => set("price", e.target.value)}
            className={inputCls}
            placeholder="Blank = no price set"
          />
        </Field>
        <Field label="Show price on public catalog">
          {/* Staff toggle — when off, the price stays internal and the public card keeps the
              "Inquire for pricing" posture. Off by default so staged/WIP prices never leak. */}
          <label className="flex items-center gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              checked={!!draft.showPrice}
              onChange={(e) => set("showPrice", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            {draft.showPrice ? "Visible to the public" : "Hidden — internal only"}
          </label>
        </Field>
      </div>
      <Field label="Description">
        <textarea
          rows={2}
          value={draft.description}
          onChange={(e) => set("description", e.target.value)}
          className={inputCls}
        />
      </Field>
      <Field label="Specifications">
        <textarea
          rows={2}
          value={draft.specifications}
          onChange={(e) => set("specifications", e.target.value)}
          className={inputCls}
        />
      </Field>

      {error && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-wide text-gray-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function PhotosColumn({ item, onChange }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  async function handleFiles(files) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      // Upload sequentially so Airtable's Content API rate limits don't trip.
      let latest = item;
      for (const file of files) {
        if (file.size > MAX_UPLOAD_BYTES) {
          throw new Error(
            `"${file.name}" is ${formatBytes(file.size)}. Max 5 MB per file.`,
          );
        }
        const base64 = await fileToBase64(file);
        const res = await fetch(`/api/clearance/items/${item.id}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type || "application/octet-stream",
            fileBase64: base64,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Upload failed (${res.status})`);
        }
        const { item: updated } = await res.json();
        latest = updated;
      }
      onChange(latest);
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function deletePhoto(attachmentId) {
    if (!confirm("Delete this photo?")) return;
    setError(null);
    try {
      const res = await fetch(
        `/api/clearance/items/${item.id}/photos?attachmentId=${attachmentId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Delete failed (${res.status})`);
      }
      const { item: updated } = await res.json();
      onChange(updated);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="w-full shrink-0 md:w-64">
      <div className="grid grid-cols-3 gap-1.5 md:grid-cols-3">
        {item.photos.map((p) => (
          <div
            key={p.id}
            className="group relative aspect-square overflow-hidden rounded-md border border-gray-200 bg-gray-50"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.thumbnailUrl}
              alt={p.filename}
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <button
              onClick={() => deletePhoto(p.id)}
              aria-label={`Delete ${p.filename}`}
              className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-gray-700 opacity-0 shadow-sm transition hover:bg-white hover:text-red-600 group-hover:opacity-100"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex aspect-square flex-col items-center justify-center gap-0.5 rounded-md border-2 border-dashed border-gray-300 text-[10px] font-medium text-gray-500 transition hover:border-brand-400 hover:text-brand-600 disabled:opacity-50"
        >
          {uploading ? (
            <span>Uploading…</span>
          ) : (
            <>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add photo</span>
            </>
          )}
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(Array.from(e.target.files || []))}
      />
      {error && (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      )}
      <p className="mt-2 text-[10px] text-gray-400">Max 5 MB per file</p>
    </div>
  );
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      // result is "data:...;base64,XXXX" — strip prefix.
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error || new Error("read error"));
    reader.readAsDataURL(file);
  });
}
