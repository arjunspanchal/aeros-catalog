"use client";
import { useState } from "react";
import { inputCls, labelCls } from "@/app/orders/_components/ui";

export default function ClientsAdmin({ initialClients }) {
  const [clients, setClients] = useState(initialClients);
  const [form, setForm] = useState({ name: "", code: "", contactPerson: "", contactEmail: "", contactPhone: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function create(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    const res = await fetch("/api/orders/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (!res.ok) { setErr((await res.json()).error || "Failed"); return; }
    const data = await res.json();
    setClients((prev) => [...prev, data.client].sort((a, b) => a.name.localeCompare(b.name)));
    setForm({ name: "", code: "", contactPerson: "", contactEmail: "", contactPhone: "" });
  }

  return (
    <div className="mt-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
      <form onSubmit={create} className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5 space-y-3 dark:bg-gray-900 dark:border-gray-800">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Add client</h2>
        <div>
          <label className={labelCls}>Name</label>
          <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label className={labelCls}>Code (optional)</label>
          <input className={inputCls} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
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
          {busy ? "Adding…" : "Add client"}
        </button>
        {err && <p className="text-xs text-red-500">{err}</p>}
      </form>

      <div className="lg:col-span-3 bg-white border border-gray-200 rounded-xl overflow-hidden dark:bg-gray-900 dark:border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase dark:bg-gray-800/50 dark:text-gray-400">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Name</th>
              <th className="text-left px-4 py-2 font-medium">Contact</th>
              <th className="text-left px-4 py-2 font-medium">Email</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {clients.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-2 text-gray-900 dark:text-white">{c.name}{c.code && <span className="text-xs text-gray-500 ml-2 dark:text-gray-400">{c.code}</span>}</td>
                <td className="px-4 py-2 text-gray-600 dark:text-gray-300">{c.contactPerson || "—"}</td>
                <td className="px-4 py-2 text-gray-600 dark:text-gray-300">{c.contactEmail || "—"}</td>
              </tr>
            ))}
            {clients.length === 0 && <tr><td colSpan={3} className="text-center text-sm text-gray-500 py-8 dark:text-gray-400">No clients yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
