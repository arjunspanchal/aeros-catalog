"use client";
import { useEffect, useState } from "react";
import { Card, Field, inputCls } from "@/app/calculator/_components/ui";
import { CURRENCY_CODES } from "@/lib/calc/calculator";

const EMPTY_NEW = { email: "", name: "", company: "", country: "", marginPct: "10", marginCupsPct: "", discountPct: "0", preferredCurrency: "INR", preferredUnit: "mm" };

// Row renders compact by default: email / name / company / country / pricing
// summary / currency / status / last-login / actions. Clicking Edit opens an
// inline detail panel with properly labeled fields so margins + discount
// aren't cramped into tiny table cells.
function ClientRow({ client, onPatched, onDeleted }) {
  const [draft, setDraft] = useState(client);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => setDraft(client), [client]);

  const dirty =
    draft.email !== client.email ||
    draft.name !== client.name ||
    draft.company !== client.company ||
    draft.country !== client.country ||
    Number(draft.marginPct) !== Number(client.marginPct) ||
    Number(draft.marginCupsPct || 0) !== Number(client.marginCupsPct || 0) ||
    Number(draft.discountPct || 0) !== Number(client.discountPct || 0) ||
    draft.preferredCurrency !== client.preferredCurrency ||
    draft.preferredUnit !== client.preferredUnit ||
    draft.status !== client.status;

  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  async function save() {
    setSaving(true);
    const payload = { id: client.id };
    if (draft.email !== client.email) payload.email = draft.email.trim().toLowerCase();
    if (draft.name !== client.name) payload.name = draft.name;
    if (draft.company !== client.company) payload.company = draft.company;
    if (draft.country !== client.country) payload.country = draft.country;
    if (Number(draft.marginPct) !== Number(client.marginPct)) payload.marginPct = Number(draft.marginPct);
    if (Number(draft.marginCupsPct || 0) !== Number(client.marginCupsPct || 0)) {
      payload.marginCupsPct = draft.marginCupsPct === "" || draft.marginCupsPct === null
        ? null
        : Number(draft.marginCupsPct);
    }
    if (Number(draft.discountPct || 0) !== Number(client.discountPct || 0)) payload.discountPct = Number(draft.discountPct || 0);
    if (draft.preferredCurrency !== client.preferredCurrency) payload.preferredCurrency = draft.preferredCurrency;
    if (draft.preferredUnit !== client.preferredUnit) payload.preferredUnit = draft.preferredUnit;
    if (draft.status !== client.status) payload.status = draft.status;

    const res = await fetch("/api/calc/clients", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || "Save failed");
      return;
    }
    onPatched(await res.json());
    setEditing(false);
  }

  function cancel() {
    setDraft(client);
    setEditing(false);
  }

  async function remove() {
    const label = client.name || client.company || client.email;
    if (!confirm(`Delete client ${label}? This cannot be undone.`)) return;
    const res = await fetch(`/api/calc/clients?id=${encodeURIComponent(client.id)}`, { method: "DELETE" });
    if (res.ok) onDeleted(client.id);
    else alert("Delete failed");
  }

  const bagMargin = Number(client.marginPct || 0);
  const cupInherited = client.marginCupsPct == null || client.marginCupsPct === "";
  const cupMargin = cupInherited ? bagMargin : Number(client.marginCupsPct);
  const discount = Number(client.discountPct || 0);
  const pricingSummary = `Bags ${bagMargin}% · Cups ${cupMargin}%${cupInherited ? " (inherited)" : ""}${discount > 0 ? ` · −${discount}%` : ""}`;

  const statusClass =
    client.status === "Active" ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
    client.status === "Blocked" ? "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
    "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";

  return (
    <>
      <tr className={`border-b border-gray-50 dark:border-gray-800 ${dirty ? "bg-amber-50/30 dark:bg-amber-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
        <td className="py-2 text-sm dark:text-gray-200">{client.email}</td>
        <td className="py-2 text-sm dark:text-gray-200">{client.name || "—"}</td>
        <td className="py-2 text-sm dark:text-gray-200">{client.company || "—"}</td>
        <td className="py-2 text-sm text-gray-500 dark:text-gray-400">{client.country || "—"}</td>
        <td className="py-2 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">{pricingSummary}</td>
        <td className="py-2 text-sm text-gray-500 dark:text-gray-400">{client.preferredCurrency || "INR"}</td>
        <td className="py-2">
          <span className={`text-xs px-2 py-0.5 rounded ${statusClass}`}>{client.status || "Pending"}</span>
        </td>
        <td className="py-2 text-gray-500 text-xs dark:text-gray-400">{client.lastLogin ? new Date(client.lastLogin).toLocaleDateString() : "—"}</td>
        <td className="py-2 text-right whitespace-nowrap">
          <button
            onClick={() => setEditing((v) => !v)}
            className="text-xs text-blue-600 hover:text-blue-800 px-2 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {editing ? "Close" : "Edit"}
          </button>
          <button
            onClick={remove}
            className="text-red-400 hover:text-red-600 text-xs px-2 dark:text-red-400 dark:hover:text-red-300"
            title="Delete client"
          >✕</button>
        </td>
      </tr>
      {editing && (
        <tr className="border-b border-gray-100 dark:border-gray-800">
          <td colSpan={9} className="p-4 bg-gray-50 dark:bg-gray-900">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Email">
                <input type="email" className={inputCls}
                  value={draft.email || ""} onChange={(e) => set("email", e.target.value)} />
              </Field>
              <Field label="Customer name">
                <input className={inputCls}
                  value={draft.name || ""} onChange={(e) => set("name", e.target.value)} />
              </Field>
              <Field label="Company">
                <input className={inputCls}
                  value={draft.company || ""} onChange={(e) => set("company", e.target.value)} />
              </Field>
              <Field label="Country">
                <input className={inputCls}
                  value={draft.country || ""} onChange={(e) => set("country", e.target.value)} />
              </Field>
              <Field label="Status">
                <select className={inputCls}
                  value={draft.status || "Pending"}
                  onChange={(e) => set("status", e.target.value)}>
                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
                  <option value="Blocked">Blocked</option>
                </select>
              </Field>
              <div className="hidden md:block" />
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">Pricing</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Bag margin %" hint="Markup on bag manufacturing cost">
                  <input type="number" step="0.5" className={inputCls}
                    value={draft.marginPct ?? ""}
                    onChange={(e) => set("marginPct", e.target.value)} />
                </Field>
                <Field label="Cup / Tub margin %" hint="Leave blank to reuse the bag margin">
                  <input type="number" step="0.5" className={inputCls}
                    placeholder="(same as bags)"
                    value={draft.marginCupsPct ?? ""}
                    onChange={(e) => set("marginCupsPct", e.target.value)} />
                </Field>
                <Field label="Discount %" hint="Applied after margin. Bags only.">
                  <input type="number" step="0.5" className={inputCls}
                    value={draft.discountPct ?? 0}
                    onChange={(e) => set("discountPct", e.target.value)} />
                </Field>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">Preferences</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Currency">
                  <select className={inputCls}
                    value={draft.preferredCurrency || "INR"}
                    onChange={(e) => set("preferredCurrency", e.target.value)}>
                    {CURRENCY_CODES.map((cc) => <option key={cc} value={cc}>{cc}</option>)}
                  </select>
                </Field>
                <Field label="Units">
                  <select className={inputCls}
                    value={draft.preferredUnit || "mm"}
                    onChange={(e) => set("preferredUnit", e.target.value)}>
                    <option value="mm">mm</option>
                    <option value="cm">cm</option>
                    <option value="in">inches</option>
                  </select>
                </Field>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button onClick={save} disabled={saving || !dirty}
                className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60">
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button onClick={cancel}
                className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2 dark:text-gray-300 dark:hover:text-white">
                Cancel
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function ClientsAdmin() {
  const [clients, setClients] = useState(null);
  const [newClient, setNewClient] = useState(EMPTY_NEW);
  const [adding, setAdding] = useState(false);
  const [addErr, setAddErr] = useState("");
  const [addOk, setAddOk] = useState(false);

  useEffect(() => {
    fetch("/api/calc/clients").then((r) => r.ok ? r.json() : []).then(setClients).catch(() => setClients([]));
  }, []);

  async function addClient(e) {
    e.preventDefault();
    setAddErr(""); setAddOk(false); setAdding(true);
    const res = await fetch("/api/calc/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newClient),
    });
    setAdding(false);
    if (!res.ok) {
      setAddErr((await res.json().catch(() => ({}))).error || "Failed to add client");
      return;
    }
    const created = await res.json();
    setClients((cs) => [created, ...(cs || [])]);
    setNewClient(EMPTY_NEW);
    setAddOk(true);
    setTimeout(() => setAddOk(false), 3000);
  }

  const onPatched = (updated) => setClients((cs) => cs.map((c) => (c.id === updated.id ? updated : c)));
  const onDeleted = (id) => setClients((cs) => cs.filter((x) => x.id !== id));

  return (
    <div className="space-y-6">
      <Card title="Onboard new client">
        <form onSubmit={addClient} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Registered email">
            <input type="email" required className={inputCls} placeholder="talico@wellbeing.com"
              value={newClient.email} onChange={(e) => setNewClient((n) => ({ ...n, email: e.target.value }))} />
          </Field>
          <Field label="Customer name">
            <input className={inputCls} placeholder="Talico"
              value={newClient.name} onChange={(e) => setNewClient((n) => ({ ...n, name: e.target.value }))} />
          </Field>
          <Field label="Company name">
            <input className={inputCls} placeholder="Wellbeing"
              value={newClient.company} onChange={(e) => setNewClient((n) => ({ ...n, company: e.target.value }))} />
          </Field>
          <Field label="Country of delivery">
            <input className={inputCls} placeholder="Israel"
              value={newClient.country} onChange={(e) => setNewClient((n) => ({ ...n, country: e.target.value }))} />
          </Field>
          <Field label="Margin % for bags">
            <input type="number" step="0.5" required className={inputCls} placeholder="10"
              value={newClient.marginPct} onChange={(e) => setNewClient((n) => ({ ...n, marginPct: e.target.value }))} />
          </Field>
          <Field label="Margin % for cups / tubs" hint="Leave blank to reuse the bag margin">
            <input type="number" step="0.5" className={inputCls} placeholder="(same as bags)"
              value={newClient.marginCupsPct} onChange={(e) => setNewClient((n) => ({ ...n, marginCupsPct: e.target.value }))} />
          </Field>
          <Field label="Discount % (applied after margin)" hint="Leave 0 for standard pricing. Applies to bags only.">
            <input type="number" step="0.5" className={inputCls} placeholder="0"
              value={newClient.discountPct} onChange={(e) => setNewClient((n) => ({ ...n, discountPct: e.target.value }))} />
          </Field>
          <Field label="Preferred currency">
            <select className={inputCls}
              value={newClient.preferredCurrency}
              onChange={(e) => setNewClient((n) => ({ ...n, preferredCurrency: e.target.value }))}>
              {CURRENCY_CODES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Preferred units">
            <select className={inputCls}
              value={newClient.preferredUnit}
              onChange={(e) => setNewClient((n) => ({ ...n, preferredUnit: e.target.value }))}>
              <option value="mm">mm</option>
              <option value="cm">cm</option>
              <option value="in">inches</option>
            </select>
          </Field>
          <div className="md:col-span-2 flex items-end">
            <button disabled={adding} className="w-full bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60">
              {adding ? "Adding…" : "+ Add client"}
            </button>
          </div>
        </form>
        {addErr && <p className="text-xs text-red-500 mt-2">{addErr}</p>}
        {addOk && <p className="text-xs text-green-600 mt-2">✓ Client added. They can now log in with that email.</p>}
        <p className="text-xs text-gray-400 mt-3 dark:text-gray-500">
          Client logs in at <code>/login</code> using the email above and a one-time code sent to it. Their margin is applied to all rate quotes automatically.
        </p>
      </Card>

      <Card title="All clients">
        {clients === null ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
        ) : clients.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No clients yet. Add one above, or let them self-register by logging in with their email.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase border-b border-gray-100 dark:text-gray-500 dark:border-gray-800">
                  <th className="text-left pb-2 font-medium">Email</th>
                  <th className="text-left pb-2 font-medium">Name</th>
                  <th className="text-left pb-2 font-medium">Company</th>
                  <th className="text-left pb-2 font-medium">Country</th>
                  <th className="text-left pb-2 font-medium">Pricing</th>
                  <th className="text-left pb-2 font-medium">Currency</th>
                  <th className="text-left pb-2 font-medium">Status</th>
                  <th className="text-left pb-2 font-medium">Last Login</th>
                  <th className="pb-2 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <ClientRow key={c.id} client={c} onPatched={onPatched} onDeleted={onDeleted} />
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-gray-400 mt-4 dark:text-gray-500">
          Click <strong>Edit</strong> on any row to change pricing, status, currency, or profile. Rows with pending changes are highlighted.<br />
          Final rate = mfg cost × (1 + margin%) × (1 − discount%). Margin marks up, discount marks down.
        </p>
      </Card>
    </div>
  );
}
