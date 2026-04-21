"use client";
import { useState } from "react";
import { Card, Field, inputCls } from "@/app/calculator/_components/ui";
import ItemRow from "./ItemRow";
import NewItemForm from "./NewItemForm";

export default function ItemsEditor({ cardId, items, onChanged }) {
  const [adding, setAdding] = useState(false);

  async function addItem(input) {
    const res = await fetch(`/api/rate-cards/${cardId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || "Add failed");
      return false;
    }
    const created = await res.json();
    onChanged([...items, created].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
    return true;
  }

  function handlePatched(updated) {
    onChanged(items.map((x) => (x.id === updated.id ? updated : x)));
  }

  function handleDeleted(id) {
    onChanged(items.filter((x) => x.id !== id));
  }

  return (
    <Card
      title={`Line items (${items.length})`}
      right={
        <button
          onClick={() => setAdding((v) => !v)}
          className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
        >
          {adding ? "Cancel" : "+ Add item"}
        </button>
      }
    >
      {adding && (
        <div className="mb-4 pb-4 border-b border-gray-100 dark:border-gray-800">
          <NewItemForm onSubmit={async (input) => { const ok = await addItem(input); if (ok) setAdding(false); }} />
        </div>
      )}
      {items.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No items yet. Click “+ Add item” to add your first SKU.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <ItemRow key={item.id} item={item} onPatched={handlePatched} onDeleted={handleDeleted} />
          ))}
        </div>
      )}
    </Card>
  );
}
