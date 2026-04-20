"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { inputCls, labelCls } from "@/app/orders/_components/ui";
import { CATEGORIES, STAGES } from "@/lib/orders/constants";

function defaultJNumber() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yy}${mm}`;
}

export default function NewJobForm({ clients, accountManagers }) {
  const router = useRouter();
  const [form, setForm] = useState({
    jNumber: `${defaultJNumber()}000`,
    clientId: "",
    brand: "",
    customerManagerId: "",
    category: "Paper Bag",
    item: "",
    city: "",
    qty: "",
    orderDate: new Date().toISOString().slice(0, 10),
    expectedDispatchDate: "",
    stage: STAGES[0],
    poNumber: "",
    paperType: "",
    gsm: "",
    rmSupplier: "",
    printingVendor: "",
    notes: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    const body = {
      ...form,
      qty: form.qty ? Number(form.qty) : undefined,
      gsm: form.gsm ? Number(form.gsm) : undefined,
      customerManagerId: form.customerManagerId || undefined,
      expectedDispatchDate: form.expectedDispatchDate || undefined,
      orderDate: form.orderDate || undefined,
    };
    const res = await fetch("/api/orders/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) { setErr((await res.json()).error || "Failed"); return; }
    const data = await res.json();
    router.push(`/orders/admin/jobs/${data.job.id}`);
  }

  return (
    <form onSubmit={submit} className="mt-6 bg-white border border-gray-200 rounded-xl p-5 space-y-4 dark:bg-gray-900 dark:border-gray-800">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>J#</label>
          <input className={inputCls} value={form.jNumber} onChange={(e) => set("jNumber", e.target.value)} required />
        </div>
        <div>
          <label className={labelCls}>PO number (optional)</label>
          <input className={inputCls} value={form.poNumber} onChange={(e) => set("poNumber", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Client</label>
          <select className={inputCls} value={form.clientId} onChange={(e) => set("clientId", e.target.value)} required>
            <option value="">Select client…</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Brand</label>
          <input className={inputCls} value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="e.g. aB Coffee" />
        </div>
        <div>
          <label className={labelCls}>Account manager</label>
          <select className={inputCls} value={form.customerManagerId} onChange={(e) => set("customerManagerId", e.target.value)}>
            <option value="">—</option>
            {accountManagers.map((u) => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Category</label>
          <select className={inputCls} value={form.category} onChange={(e) => set("category", e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Item</label>
          <input className={inputCls} value={form.item} onChange={(e) => set("item", e.target.value)} placeholder="e.g. 250 ml DW Paper Cup" required />
        </div>
        <div>
          <label className={labelCls}>City</label>
          <input className={inputCls} value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Destination" />
        </div>
        <div>
          <label className={labelCls}>Quantity</label>
          <input type="number" className={inputCls} value={form.qty} onChange={(e) => set("qty", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Order date</label>
          <input type="date" className={inputCls} value={form.orderDate} onChange={(e) => set("orderDate", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Expected dispatch</label>
          <input type="date" className={inputCls} value={form.expectedDispatchDate} onChange={(e) => set("expectedDispatchDate", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Paper type</label>
          <input className={inputCls} value={form.paperType} onChange={(e) => set("paperType", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>GSM</label>
          <input type="number" className={inputCls} value={form.gsm} onChange={(e) => set("gsm", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>RM supplier</label>
          <input className={inputCls} value={form.rmSupplier} onChange={(e) => set("rmSupplier", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Printing vendor</label>
          <input className={inputCls} value={form.printingVendor} onChange={(e) => set("printingVendor", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Starting stage</label>
          <select className={inputCls} value={form.stage} onChange={(e) => set("stage", e.target.value)}>
            {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Notes (visible to customer)</label>
          <textarea rows={2} className={inputCls} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button disabled={busy} className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60">
          {busy ? "Creating…" : "Create job"}
        </button>
        {err && <span className="text-xs text-red-500">{err}</span>}
      </div>
    </form>
  );
}
