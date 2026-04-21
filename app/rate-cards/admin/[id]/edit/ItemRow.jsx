"use client";
import { useState } from "react";
import { Field, inputCls } from "@/app/calculator/_components/ui";
import ItemForm from "./ItemForm";

export default function ItemRow({ item, onPatched, onDeleted }) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function saveEdits(input) {
    const res = await fetch(`/api/rate-cards/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || "Save failed");
      return false;
    }
    const updated = await res.json();
    onPatched(updated);
    setEditing(false);
    return true;
  }

  async function remove() {
    if (!confirm(`Delete "${item.productName}"?`)) return;
    setDeleting(true);
    const res = await fetch(`/api/rate-cards/items/${item.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) onDeleted(item.id);
    else alert("Delete failed");
  }

  if (editing) {
    return (
      <div className="border border-blue-200 rounded-lg p-3 bg-blue-50/30 dark:border-blue-900 dark:bg-blue-950/30">
        <ItemForm
          initial={item}
          submitLabel="Save item"
          onSubmit={saveEdits}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 border border-gray-100 rounded-lg p-3 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-gray-900 dark:text-gray-100">{item.productName}</span>
          {item.section && <span className="text-xs text-gray-400 dark:text-gray-500">· {item.section}</span>}
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            item.pricingMode === "cup_formula"
              ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
          }`}>
            {item.pricingMode === "cup_formula" ? "Cup formula (live)" : "Fixed"}
          </span>
        </div>
        <div className="text-xs text-gray-500 mt-1 dark:text-gray-400 truncate">
          {[
            item.brand,
            item.printing,
            item.productSku && `SKU ${item.productSku}`,
            item.material,
            item.moq && `MOQ ${item.moq}`,
          ].filter(Boolean).join(" · ") || "—"}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={() => setEditing(true)} className="text-xs text-blue-600 hover:text-blue-700 px-2 dark:text-blue-400">Edit</button>
        <button onClick={remove} disabled={deleting} className="text-xs text-red-500 hover:text-red-600 px-2">
          {deleting ? "…" : "Delete"}
        </button>
      </div>
    </div>
  );
}
