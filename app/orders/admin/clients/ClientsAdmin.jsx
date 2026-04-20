"use client";
import { useState } from "react";
import { inputCls, labelCls } from "@/app/orders/_components/ui";

const EMPTY = {
  name: "",
  code: "",
  contactPerson: "",
  contactEmail: "",
  contactPhone: "",
  brandManager: "",
  brandManagerEmail: "",
};

export default function ClientsAdmin({ initialClients }) {
  const [clients, setClients] = useState(initialClients);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const isEditing = editingId !== null;

  function startEdit(c) {
    setEditingId(c.id);
    setForm({
      name: c.name || "",
      code: c.code || "",
      contactPerson: c.contactPerson || "",
      contactEmail: c.contactEmail || "",
      contactPhone: c.contactPhone || "",
      brandManager: c.brandManager || "",
      brandManagerEmail: c.brandManagerEmail || "",
    });
    setErr("");
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY);
    setErr("");
  }

  async function submit(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    const url = isEditing ? `/api/orders/clients/${editingId}` : "/api/orders/clients";
    const method = isEditing ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (!res.ok) { setErr((await res.json()).error || "Failed"); return; }
    const data = await res.json();
    if (isEditing) {
      setClients((prev) => prev.map((c) => (c.id === editingId ? data.client : c)).sort((a, b) => a.name.localeCompare(b.name)));
    } else {
      setClients((prev) => [...prev, data.client].sort((a, b) => a.name.localeCompare(b.name)));
    }
    cancelEdit();
  }

  return (
    <div className="mt-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
      <form onSubmit={submit} className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5 space-y-3 dark:bg-gray-900 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            {isEditing ? "Edit client" : "Add client"}
          </h2>
          {isEditing && (
            <button type="button" onClick={cancelEdit} className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              Cancel
            </button>
          )}
        </div>
        <div>
          <label className={labelCls}>Name</label>
          <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label className={labelCls}>Code (optional)</label>
          <input className={inputCls} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>Brand manager</label>
          <input className={inputCls} value={form.brandManager} onChange={(e) => setForm({ ...form, brandManager: e.target.value })} placeholder="e.g. Vinay Dubey" />
        </div>
        <div>
          <label className={labelCls}>Brand manager email</label>
          <input type="email" className={inputCls} value={form.brandManagerEmail} onChange={(e) => setForm({ ...form, brandManagerEmail: e.target.value })} placeholder="e.g. vinay@theepackagingcompany.com" />
        </div>
        <div>
          <label className={labelCls}>Contact person</label>
          <input className={inputCls} value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>Contact email</label>
          <input type="email" className={inputCls} value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>Contact phone</label>
          <input className={inputCls} value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
        </div>
        <button disabled={busy} className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60">
          {busy ? (isEditing ? "Saving…" : "Adding…") : (isEditing ? "Save changes" : "Add client")}
        </button>
        {err && <p className="text-xs text-red-500">{err}</p>}
      </form>

      <div className="lg:col-span-3 bg-white border border-gray-200 rounded-xl overflow-hidden dark:bg-gray-900 dark:border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase dark:bg-gray-800/50 dark:text-gray-400">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Name</th>
              <th className="text-left px-4 py-2 font-medium">Brand manager</th>
              <th className="text-left px-4 py-2 font-medium">Contact</th>
              <th className="text-right px-4 py-2 font-medium">&nbsp;</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {clients.map((c) => (
              <tr key={c.id} className={editingId === c.id ? "bg-blue-50 dark:bg-blue-900/20" : ""}>
                <td className="px-4 py-2">
                  <div className="text-gray-900 dark:text-white">{c.name}</div>
                  {c.code && <div className="text-xs text-gray-500 dark:text-gray-400">{c.code}</div>}
                </td>
                <td className="px-4 py-2">
                  {c.brandManager || c.brandManagerEmail ? (
                    <>
                      <div className="text-gray-900 dark:text-white">{c.brandManager || "—"}</div>
                      {c.brandManagerEmail && <div className="text-xs text-gray-500 dark:text-gray-400">{c.brandManagerEmail}</div>}
                    </>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">—</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <div className="text-gray-600 dark:text-gray-300">{c.contactPerson || "—"}</div>
                  {c.contactEmail && <div className="text-xs text-gray-500 dark:text-gray-400">{c.contactEmail}</div>}
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => startEdit(c)}
                    className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
            {clients.length === 0 && <tr><td colSpan={4} className="text-center text-sm text-gray-500 py-8 dark:text-gray-400">No clients yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
