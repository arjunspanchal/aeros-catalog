"use client";
import { useState } from "react";
import { inputCls, labelCls } from "@/app/orders/_components/ui";

export default function ProfileForm({ initial }) {
  const [form, setForm] = useState({
    name: initial?.name || "",
    designation: initial?.designation || "",
    phone: initial?.phone || "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);

  async function save(e) {
    e.preventDefault();
    setErr(""); setOk(false); setBusy(true);
    const res = await fetch("/api/orders/auth/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (!res.ok) { setErr((await res.json()).error || "Failed"); return; }
    setOk(true);
    setTimeout(() => setOk(false), 2500);
  }

  return (
    <form onSubmit={save} className="mt-6 bg-white border border-gray-200 rounded-xl p-5 space-y-4 dark:bg-gray-900 dark:border-gray-800">
      <div>
        <label className={labelCls}>Email</label>
        <input className={`${inputCls} opacity-60`} value={initial?.email || ""} disabled />
        <p className="text-xs text-gray-400 mt-1 dark:text-gray-500">This is how you sign in. Contact Aeros to change.</p>
      </div>
      <div>
        <label className={labelCls}>Full name</label>
        <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Vinay Dubey" />
      </div>
      <div>
        <label className={labelCls}>Designation</label>
        <input className={inputCls} value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="e.g. Brand Manager" />
      </div>
      <div>
        <label className={labelCls}>Phone</label>
        <input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91…" />
      </div>
      <div className="flex items-center gap-3 pt-2">
        <button disabled={busy} className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60">
          {busy ? "Saving…" : "Save profile"}
        </button>
        {ok && <span className="text-xs text-green-600 dark:text-green-400">Saved</span>}
        {err && <span className="text-xs text-red-500">{err}</span>}
      </div>
    </form>
  );
}
