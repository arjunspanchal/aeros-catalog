"use client";
import { useMemo, useState } from "react";
import { inputCls, labelCls } from "@/app/orders/_components/ui";

const FORMS = ["", "Rolls", "Sheets", "Reams"];
const STATUSES = ["", "In Stock", "Reserved", "Low", "Depleted"];

const EMPTY = {
  name: "",
  paperType: "",
  gsm: "",
  bf: "",
  sizeMm: "",
  form: "",
  supplier: "",
  baseRate: "",
  discount: "",
  transport: "",
  wetStrengthExtra: "",
  qtyRolls: "",
  qtyKgs: "",
  coating: "",
  location: "",
  status: "",
  notes: "",
  active: true,
};

function toForm(rm) {
  return {
    name: rm.name || "",
    paperType: rm.paperType || "",
    gsm: rm.gsm != null ? String(rm.gsm) : "",
    bf: rm.bf != null ? String(rm.bf) : "",
    sizeMm: rm.sizeMm != null ? String(rm.sizeMm) : "",
    form: rm.form || "",
    supplier: rm.supplier || "",
    baseRate: rm.baseRate != null ? String(rm.baseRate) : "",
    discount: rm.discount != null ? String(rm.discount) : "",
    transport: rm.transport != null ? String(rm.transport) : "",
    wetStrengthExtra: rm.wetStrengthExtra != null ? String(rm.wetStrengthExtra) : "",
    qtyRolls: rm.qtyRolls != null ? String(rm.qtyRolls) : "",
    qtyKgs: rm.qtyKgs != null ? String(rm.qtyKgs) : "",
    coating: rm.coating || "",
    location: rm.location || "",
    status: rm.status || "",
    notes: rm.notes || "",
    active: rm.active !== false,
  };
}

function toBody(form) {
  const num = (v) => (v === "" ? undefined : Number(v));
  return {
    name: form.name.trim(),
    paperType: form.paperType.trim(),
    gsm: num(form.gsm),
    bf: num(form.bf),
    sizeMm: num(form.sizeMm),
    form: form.form,
    supplier: form.supplier.trim(),
    baseRate: num(form.baseRate),
    discount: num(form.discount),
    transport: num(form.transport),
    wetStrengthExtra: num(form.wetStrengthExtra),
    qtyRolls: num(form.qtyRolls),
    qtyKgs: num(form.qtyKgs),
    coating: form.coating.trim(),
    location: form.location.trim(),
    status: form.status,
    notes: form.notes,
    active: form.active,
  };
}

function effectiveRate(rm) {
  if (rm.effectiveRate != null) return rm.effectiveRate;
  if (rm.baseRate == null) return null;
  return (rm.baseRate || 0) - (rm.discount || 0) + (rm.transport || 0);
}

const STATUS_COLORS = {
  "In Stock": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200",
  "Reserved": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
  "Low": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200",
  "Depleted": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
};

export default function RawMaterialsAdmin({ initialRawMaterials }) {
  const [rawMaterials, setRawMaterials] = useState(initialRawMaterials);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const isEditing = editingId !== null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rawMaterials.filter((rm) => {
      if (statusFilter !== "all" && rm.status !== statusFilter) return false;
      if (!q) return true;
      return `${rm.name} ${rm.supplier} ${rm.paperType} ${rm.gsm ?? ""} ${rm.bf ?? ""} ${rm.sizeMm ?? ""} ${rm.form} ${rm.location}`.toLowerCase().includes(q);
    });
  }, [rawMaterials, query, statusFilter]);

  // Stock totals for the summary cards.
  const totals = useMemo(() => {
    const t = { rolls: 0, kgs: 0, lines: 0, low: 0 };
    for (const rm of rawMaterials) {
      if (rm.qtyRolls) t.rolls += rm.qtyRolls;
      if (rm.qtyKgs) t.kgs += rm.qtyKgs;
      if (rm.qtyRolls || rm.qtyKgs) t.lines++;
      if (rm.status === "Low" || rm.status === "Depleted") t.low++;
    }
    return t;
  }, [rawMaterials]);

  function startEdit(rm) {
    setEditingId(rm.id);
    setForm(toForm(rm));
    setErr("");
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
    const url = isEditing ? `/api/orders/raw-materials/${editingId}` : "/api/orders/raw-materials";
    const method = isEditing ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toBody(form)),
    });
    setBusy(false);
    if (!res.ok) { setErr((await res.json()).error || "Failed"); return; }
    const data = await res.json();
    const rm = data.rawMaterial;
    setRawMaterials((prev) => {
      const next = isEditing ? prev.map((x) => (x.id === editingId ? rm : x)) : [...prev, rm];
      return next.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    });
    cancelEdit();
  }

  async function requestDelete(rm) {
    if (!window.confirm(`Delete "${rm.name || "this stock line"}"? This cannot be undone.`)) return;
    setBusy(true);
    const res = await fetch(`/api/orders/raw-materials/${rm.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) { alert(`Delete failed: ${(await res.json()).error || "unknown"}`); return; }
    setRawMaterials((prev) => prev.filter((x) => x.id !== rm.id));
    if (editingId === rm.id) cancelEdit();
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCard label="SKUs tracked" value={rawMaterials.length} />
        <StatCard label="Stock lines" value={totals.lines} />
        <StatCard label="Total rolls" value={totals.rolls.toLocaleString("en-IN")} />
        <StatCard label="Total kgs" value={totals.kgs.toLocaleString("en-IN", { maximumFractionDigits: 1 })} tone={totals.low ? "warn" : "ok"} sub={totals.low ? `${totals.low} low/depleted` : null} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <form onSubmit={submit} className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5 space-y-3 dark:bg-gray-900 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              {isEditing ? "Edit raw material" : "Add raw material"}
            </h2>
            {isEditing && (
              <button type="button" onClick={cancelEdit} className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                Cancel
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Supplier</label>
              <input className={inputCls} value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="BILT, Ajit Mill…" />
            </div>
            <div>
              <label className={labelCls}>Paper type</label>
              <input className={inputCls} value={form.paperType} onChange={(e) => setForm({ ...form, paperType: e.target.value })} placeholder="Brown Kraft…" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>GSM</label>
              <input type="number" className={inputCls} value={form.gsm} onChange={(e) => setForm({ ...form, gsm: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>BF</label>
              <input type="number" className={inputCls} value={form.bf} onChange={(e) => setForm({ ...form, bf: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Form</label>
              <select className={inputCls} value={form.form} onChange={(e) => setForm({ ...form, form: e.target.value })}>
                {FORMS.map((f) => <option key={f} value={f}>{f || "—"}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Size (mm)</label>
              <input type="number" className={inputCls} value={form.sizeMm} onChange={(e) => setForm({ ...form, sizeMm: e.target.value })} placeholder="890" />
            </div>
            <div>
              <label className={labelCls}>Coating</label>
              <input className={inputCls} value={form.coating} onChange={(e) => setForm({ ...form, coating: e.target.value })} placeholder="None / Matt / Gloss" />
            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
            <h3 className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2 dark:text-gray-400">Stock on hand</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Qty (rolls)</label>
                <input type="number" className={inputCls} value={form.qtyRolls} onChange={(e) => setForm({ ...form, qtyRolls: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Qty (kgs)</label>
                <input type="number" step="0.01" className={inputCls} value={form.qtyKgs} onChange={(e) => setForm({ ...form, qtyKgs: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Status</label>
                <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s || "—"}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Location</label>
                <input className={inputCls} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Warehouse / Factory" />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
            <h3 className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2 dark:text-gray-400">Pricing (optional)</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Base rate (₹/kg)</label>
                <input type="number" step="0.01" className={inputCls} value={form.baseRate} onChange={(e) => setForm({ ...form, baseRate: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Discount (₹/kg)</label>
                <input type="number" step="0.01" className={inputCls} value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Transport (₹/kg)</label>
                <input type="number" step="0.01" className={inputCls} value={form.transport} onChange={(e) => setForm({ ...form, transport: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Wet strength (₹/kg)</label>
                <input type="number" step="0.01" className={inputCls} value={form.wetStrengthExtra} onChange={(e) => setForm({ ...form, wetStrengthExtra: e.target.value })} />
              </div>
            </div>
          </div>

          <div>
            <label className={labelCls}>Display name (auto-generated if blank)</label>
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Leave blank to auto-label from supplier/type/GSM" />
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea rows={2} className={inputCls} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            Active (show in New Job picker)
          </label>
          <button disabled={busy} className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60">
            {busy ? (isEditing ? "Saving…" : "Adding…") : (isEditing ? "Save changes" : "Add raw material")}
          </button>
          {err && <p className="text-xs text-red-500">{err}</p>}
        </form>

        <div className="lg:col-span-3 bg-white border border-gray-200 rounded-xl overflow-hidden dark:bg-gray-900 dark:border-gray-800">
          <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row gap-2">
            <input
              className={`${inputCls} flex-1`}
              placeholder={`Search ${rawMaterials.length} raw materials…`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select className={`${inputCls} sm:w-40`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All statuses</option>
              {STATUSES.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase dark:bg-gray-800/50 dark:text-gray-400">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Name / Spec</th>
                  <th className="text-left px-4 py-2 font-medium">Supplier</th>
                  <th className="text-right px-4 py-2 font-medium">Rolls</th>
                  <th className="text-right px-4 py-2 font-medium">Kgs</th>
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                  <th className="text-right px-4 py-2 font-medium">Rate</th>
                  <th className="text-right px-4 py-2 font-medium">&nbsp;</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map((rm) => {
                  const eff = effectiveRate(rm);
                  return (
                    <tr key={rm.id} className={editingId === rm.id ? "bg-blue-50 dark:bg-blue-900/20" : rm.active ? "" : "opacity-60"}>
                      <td className="px-4 py-2">
                        <div className="text-gray-900 dark:text-white">{rm.name || "—"}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {rm.paperType || "—"}
                          {rm.gsm != null ? ` · ${rm.gsm} GSM` : ""}
                          {rm.bf != null ? ` · ${rm.bf} BF` : ""}
                          {rm.sizeMm ? ` · ${rm.sizeMm}mm` : ""}
                          {rm.form ? ` · ${rm.form}` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-gray-700 dark:text-gray-200">{rm.supplier || "—"}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-gray-900 dark:text-white">{rm.qtyRolls != null ? rm.qtyRolls.toLocaleString("en-IN") : "—"}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-gray-900 dark:text-white">{rm.qtyKgs != null ? rm.qtyKgs.toLocaleString("en-IN", { maximumFractionDigits: 1 }) : "—"}</td>
                      <td className="px-4 py-2">
                        {rm.status ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${STATUS_COLORS[rm.status] || ""}`}>{rm.status}</span>
                        ) : <span className="text-gray-400 dark:text-gray-500 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        {eff != null ? (
                          <div className="text-gray-900 dark:text-white">₹{eff.toFixed(2)}</div>
                        ) : <span className="text-gray-400 dark:text-gray-500">—</span>}
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <button onClick={() => startEdit(rm)} className="text-xs text-blue-600 hover:underline dark:text-blue-400 mr-3">Edit</button>
                        <button onClick={() => requestDelete(rm)} disabled={busy} className="text-xs text-red-600 hover:underline dark:text-red-400 disabled:opacity-50">Delete</button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && <tr><td colSpan={7} className="text-center text-sm text-gray-500 py-8 dark:text-gray-400">{rawMaterials.length === 0 ? "No raw materials yet." : "No matches."}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, tone }) {
  const border = tone === "warn" ? "border-amber-300 dark:border-amber-700" : "border-gray-200 dark:border-gray-800";
  return (
    <div className={`bg-white rounded-lg p-3 border ${border} dark:bg-gray-900`}>
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
      <div className="text-lg font-bold text-gray-900 dark:text-white">{value}</div>
      {sub && <div className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">{sub}</div>}
    </div>
  );
}
