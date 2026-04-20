"use client";
import { useEffect, useState } from "react";
import { Card, Field, inputCls } from "@/app/calculator/_components/ui";
import { CURRENCY_CODES } from "@/lib/calc/calculator";

const EMPTY_NEW = { email: "", name: "", company: "", country: "", marginPct: "10", discountPct: "0", preferredCurrency: "INR", preferredUnit: "mm" };

// Editable row with an explicit Save button. Local state tracks in-progress edits;
// nothing hits Airtable until the admin clicks Save.
function ClientRow({ client, onPatched, onDeleted }) {
  const [draft, setDraft] = useState(client);
  const [saving, setSaving] = useState(false);

  useEffect(() => setDraft(client), [client]);

  const dirty =
    draft.email !== client.email ||
    draft.name !== client.name ||
    draft.company !== client.company ||
    draft.country !== client.country ||
    Number(draft.marginPct) !== Number(client.marginPct) ||
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
  }

  function cancel() {
    setDraft(client);
  }

  async function remove() {
    const label = client.name || client.company || client.email;
    if (!confirm(`Delete client ${label}? This cannot be undone.`)) return;
    const res = await fetch(`/api/calc/clients?id=${encodeURIComponent(client.id)}`, { method: "DELETE" });
    if (res.ok) onDeleted(client.id);
    else alert("Delete failed");
  }

  const cellInput = "text-sm bg-transparent border-b border-transparent hover:border-gray-200 focus:border-blue-500 focus:outline-none px-1 py-0.5 dark:text-gray-200 dark:hover:border-gray-700 dark:focus:border-blue-400";

  return (
    <tr className={`border-b border-gray-50 dark:border-gray-800 ${dirty ? "bg-amber-50/30 dark:bg-amber-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
      <td className="py-2">
        <input type="email" className={`${cellInput} w-56`}
          value={draft.email} onChange={(e) => set("email", e.target.value)} />
      </td>
      <td className="py-2">
        <input className={`${cellInput} w-32`} value={draft.name || ""} onChange={(e) => set("name", e.target.value)} />
      </td>
      <td className="py-2">
        <input className={`${cellInput} w-32`} value={draft.company || ""} onChange={(e) => set("company", e.target.value)} />
      </td>
      <td className="py-2">
        <input className={`${cellInput} w-24`} value={draft.country || ""} onChange={(e) => set("country", e.target.value)} />
      </td>
      <td className="py-2 text-right">
        <input type="number" step="0.5"
          className={`${cellInput} w-16 text-right`}
          value={draft.marginPct ?? ""}
          onChange={(e) => set("marginPct", e.target.value)} />
        <span className="text-gray-400 text-xs ml-1 dark:text-gray-500">%</span>
      </td>
      <td className="py-2 text-right">
        <input type="number" step="0.5"
          className={`${cellInput} w-16 text-right`}
          value={draft.discountPct ?? 0}
          onChange={(e) => set("discountPct", e.target.value)} />
        <span className="text-gray-400 text-xs ml-1 dark:text-gray-500">%</span>
      </td>
      <td className="py-2">
        <select className="text-sm bg-transparent border-none focus:outline-none dark:text-gray-200 dark:[&>option]:bg-gray-800"
          value={draft.preferredCurrency || "INR"}
          onChange={(e) => set("preferredCurrency", e.target.value)}>
          {CURRENCY_CODES.map((cc) => <option key={cc} value={cc}>{cc}</option>)}
        </select>
      </td>
      <td className="py-2">
        <select className="text-sm bg-transparent border-none focus:outline-none dark:text-gray-200 dark:[&>option]:bg-gray-800"
          value={draft.preferredUnit || "mm"}
          onChange={(e) => set("preferredUnit", e.target.value)}>
          <option value="mm">mm</option>
          <option value="cm">cm</option>
          <option value="in">in</option>
        </select>
      </td>
      <td className="py-2">
        <select className="text-sm bg-transparent border-none focus:outline-none dark:text-gray-200 dark:[&>option]:bg-gray-800"
          value={draft.status}
          onChange={(e) => set("status", e.target.value)}>
          <option value="Active">Active</option>
          <option value="Pending">Pending</option>
          <option value="Blocked">Blocked</option>
        </select>
      </td>
      <td className="py-2 text-gray-500 text-xs dark:text-gray-400">{client.lastLogin ? new Date(client.lastLogin).toLocaleDateString() : "—"}</td>
      <td className="py-2 text-right whitespace-nowrap">
        {dirty ? (
          <>
            <button onClick={save} disabled={saving}
              className="text-xs bg-blue-600 text-white px-2.5 py-1 rounded hover:bg-blue-700 disabled:opacity-60 mr-1">
              {saving ? "Saving…" : "Save"}
            </button>
            <button onClick={cancel} className="text-xs text-gray-500 hover:text-gray-700 px-1 dark:text-gray-400 dark:hover:text-gray-200">Cancel</button>
          </>
        ) : (
          <button onClick={remove} className="text-red-400 hover:text-red-600 text-xs px-2 dark:text-red-400 dark:hover:text-red-300" title="Delete client">✕</button>
        )}
      </td>
    </tr>
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
          <Field label="Discount % (applied after margin)" hint="Leave 0 for standard pricing">
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
          Client logs in at <code>/calculator/login</code> using the email above and a one-time code sent to it. Their margin is applied to all rate quotes automatically.
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
                  <th className="text-right pb-2 font-medium">Margin %</th>
                  <th className="text-right pb-2 font-medium">Discount %</th>
                  <th className="text-left pb-2 font-medium">Currency</th>
                  <th className="text-left pb-2 font-medium">Units</th>
                  <th className="text-left pb-2 font-medium">Status</th>
                  <th className="text-left pb-2 font-medium">Last Login</th>
                  <th className="pb-2"></th>
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
          Edit any cell, then click <strong>Save</strong> to commit. Rows with pending changes are highlighted.<br />
          Final rate = mfg cost × (1 + margin%) × (1 − discount%). Margin marks up, discount marks down.
        </p>
      </Card>
    </div>
  );
}
