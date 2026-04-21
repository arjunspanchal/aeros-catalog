"use client";
import { useRef, useState } from "react";
import { inputCls, labelCls } from "@/app/factoryos/_components/ui";
import { MACHINE_TYPES, MACHINE_STATUSES } from "@/lib/factoryos/constants";

const EMPTY = {
  name: "",
  type: "paper_bag",
  status: "active",
  location: "",
  notes: "",
  active: true,
};

const typeLabel = Object.fromEntries(MACHINE_TYPES.map((t) => [t.value, t.label]));
const statusLabel = Object.fromEntries(MACHINE_STATUSES.map((s) => [s.value, s.label]));

export default function MachinesAdmin({ initialMachines }) {
  const [machines, setMachines] = useState(initialMachines);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const formRef = useRef(null);

  const isEditing = editingId !== null;

  function startEdit(m) {
    setEditingId(m.id);
    setForm({
      name: m.name || "",
      type: m.type || "paper_bag",
      status: m.status || "active",
      location: m.location || "",
      notes: m.notes || "",
      active: m.active !== false,
    });
    setErr("");
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY);
    setErr("");
  }

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const url = isEditing ? `/api/factoryos/machines/${editingId}` : "/api/factoryos/machines";
    const method = isEditing ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (!res.ok) {
      setErr((await res.json()).error || "Failed");
      return;
    }
    const data = await res.json();
    if (isEditing) {
      setMachines((prev) =>
        prev.map((m) => (m.id === editingId ? data.machine : m)).sort((a, b) => a.name.localeCompare(b.name))
      );
    } else {
      setMachines((prev) => [...prev, data.machine].sort((a, b) => a.name.localeCompare(b.name)));
    }
    cancelEdit();
  }

  async function removeMachine(m) {
    if (!confirm(`Delete "${m.name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/factoryos/machines/${m.id}`, { method: "DELETE" });
    if (!res.ok) {
      alert((await res.json()).error || "Failed to delete");
      return;
    }
    setMachines((prev) => prev.filter((x) => x.id !== m.id));
    if (editingId === m.id) cancelEdit();
  }

  return (
    <div className="mt-6 grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
      <form
        ref={formRef}
        onSubmit={submit}
        className={`lg:col-span-2 bg-white rounded-xl p-4 sm:p-5 space-y-3 dark:bg-gray-900 border-2 lg:sticky lg:top-4 lg:self-start transition-colors ${isEditing ? "border-blue-500 dark:border-blue-400" : "border-gray-200 dark:border-gray-800"}`}
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className={`text-sm sm:text-base font-semibold ${isEditing ? "text-blue-600 dark:text-blue-400" : "text-gray-900 dark:text-white"}`}>
            {isEditing ? "✏️ Edit machine" : "Add machine"}
          </h2>
          {isEditing && (
            <button
              type="button"
              onClick={cancelEdit}
              className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 whitespace-nowrap font-medium"
            >
              ✕ Cancel
            </button>
          )}
        </div>
        <div>
          <label className={labelCls}>Name</label>
          <input
            className={`${inputCls} text-base`}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Paper Bag Machine #1"
            required
          />
        </div>
        <div>
          <label className={labelCls}>Type</label>
          <select
            className={`${inputCls} text-base`}
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            {MACHINE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <select
            className={`${inputCls} text-base`}
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            {MACHINE_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Location</label>
          <input
            className={`${inputCls} text-base`}
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="Optional — e.g. Floor 2, Bay A"
          />
        </div>
        <div>
          <label className={labelCls}>Notes / specs</label>
          <textarea
            className={`${inputCls} text-base`}
            rows={3}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Max bag size, speed, make/model, anything useful"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
            className="w-4 h-4 rounded border-gray-300 accent-blue-600 cursor-pointer"
          />
          Active (available for new production runs)
        </label>
        <button
          disabled={busy}
          className={`w-full text-white text-sm sm:text-base font-medium px-4 py-2.5 sm:py-2 rounded-lg transition-colors ${isEditing ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"} disabled:opacity-60`}
        >
          {busy ? (isEditing ? "Saving…" : "Adding…") : isEditing ? "✓ Save changes" : "Add machine"}
        </button>
        {err && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2 text-xs sm:text-sm text-red-700 dark:text-red-300 font-medium">
            ⚠️ {err}
          </div>
        )}
      </form>

      {/* Desktop table */}
      <div className="lg:col-span-3 space-y-3">
        <div className="hidden md:block bg-white border border-gray-200 rounded-xl dark:bg-gray-900 dark:border-gray-800" style={{ overflow: "hidden" }}>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase dark:bg-gray-800/50 dark:text-gray-400">
                <tr>
                  <th className="text-left px-4 py-2 font-medium whitespace-nowrap">Name</th>
                  <th className="text-left px-4 py-2 font-medium whitespace-nowrap">Type</th>
                  <th className="text-left px-4 py-2 font-medium whitespace-nowrap">Status</th>
                  <th className="text-left px-4 py-2 font-medium whitespace-nowrap">Location</th>
                  <th className="text-right px-4 py-2 font-medium whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {machines.map((m) => (
                  <tr key={m.id} className={editingId === m.id ? "bg-blue-50 dark:bg-blue-900/20" : ""}>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white font-medium whitespace-nowrap">
                      {m.name}
                      {!m.active && <span className="ml-2 text-xs text-gray-400">(inactive)</span>}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">{typeLabel[m.type] || m.type}</td>
                    <td className="px-4 py-2 text-xs whitespace-nowrap">
                      <StatusPill status={m.status} />
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">{m.location || "—"}</td>
                    <td className="px-4 py-2 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => startEdit(m)}
                        className="text-xs px-3 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => removeMachine(m)}
                        className="text-xs px-3 py-1 rounded-md bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50 font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {machines.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-sm text-gray-500 py-8 dark:text-gray-400">
                      No machines yet. Add your first one on the left.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {machines.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-4 text-center text-sm text-gray-500 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-400">
              No machines yet.
            </div>
          ) : (
            machines.map((m) => (
              <div
                key={m.id}
                className={`bg-white border border-gray-200 rounded-lg p-4 space-y-3 dark:bg-gray-900 dark:border-gray-800 ${editingId === m.id ? "ring-2 ring-blue-500" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{m.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{typeLabel[m.type] || m.type}</p>
                  </div>
                  <StatusPill status={m.status} />
                </div>
                {m.location && <p className="text-xs text-gray-600 dark:text-gray-300">📍 {m.location}</p>}
                {m.notes && <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{m.notes}</p>}
                {!m.active && <p className="text-xs text-gray-400">Inactive</p>}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => startEdit(m)}
                    className="flex-1 text-xs font-medium px-3 py-2 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => removeMachine(m)}
                    className="flex-1 text-xs font-medium px-3 py-2 rounded-md bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const label = statusLabel[status] || status;
  const cls =
    status === "active"
      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
      : status === "maintenance"
      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
      : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300";
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{label}</span>;
}
