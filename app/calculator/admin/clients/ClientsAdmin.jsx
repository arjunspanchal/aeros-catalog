"use client";
import { useEffect, useState } from "react";
import { Card, Field, inputCls } from "@/app/calculator/_components/ui";

const EMPTY_NEW = { email: "", name: "", company: "", country: "", marginPct: "10" };

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

  async function patch(id, updates) {
    const res = await fetch("/api/calc/clients", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    if (res.ok) {
      const updated = await res.json();
      setClients((cs) => cs.map((c) => (c.id === id ? updated : c)));
    }
  }

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
          <div className="flex items-end">
            <button disabled={adding} className="w-full bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60">
              {adding ? "Adding…" : "+ Add client"}
            </button>
          </div>
        </form>
        {addErr && <p className="text-xs text-red-500 mt-2">{addErr}</p>}
        {addOk && <p className="text-xs text-green-600 mt-2">✓ Client added. They can now log in with that email.</p>}
        <p className="text-xs text-gray-400 mt-3">
          Client logs in at <code>/calculator/login</code> using the email above and a one-time code sent to it. Their margin is applied to all rate quotes automatically.
        </p>
      </Card>

      <Card title="All clients">
        {clients === null ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : clients.length === 0 ? (
          <p className="text-sm text-gray-500">No clients yet. Add one above, or let them self-register by logging in with their email.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                  <th className="text-left pb-2 font-medium">Email</th>
                  <th className="text-left pb-2 font-medium">Name</th>
                  <th className="text-left pb-2 font-medium">Company</th>
                  <th className="text-left pb-2 font-medium">Country</th>
                  <th className="text-right pb-2 font-medium">Margin %</th>
                  <th className="text-left pb-2 font-medium">Status</th>
                  <th className="text-left pb-2 font-medium">Last Login</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 text-gray-800">{c.email}</td>
                    <td className="py-2">
                      <input className="text-sm bg-transparent border-b border-transparent hover:border-gray-200 focus:border-blue-500 focus:outline-none px-1 py-0.5 w-32"
                        defaultValue={c.name}
                        onBlur={(e) => e.target.value !== c.name && patch(c.id, { name: e.target.value })} />
                    </td>
                    <td className="py-2">
                      <input className="text-sm bg-transparent border-b border-transparent hover:border-gray-200 focus:border-blue-500 focus:outline-none px-1 py-0.5 w-32"
                        defaultValue={c.company}
                        onBlur={(e) => e.target.value !== c.company && patch(c.id, { company: e.target.value })} />
                    </td>
                    <td className="py-2">
                      <input className="text-sm bg-transparent border-b border-transparent hover:border-gray-200 focus:border-blue-500 focus:outline-none px-1 py-0.5 w-24"
                        defaultValue={c.country}
                        onBlur={(e) => e.target.value !== c.country && patch(c.id, { country: e.target.value })} />
                    </td>
                    <td className="py-2 text-right">
                      <input type="number" step="0.5"
                        className="w-16 text-right text-sm bg-transparent border-b border-transparent hover:border-gray-200 focus:border-blue-500 focus:outline-none px-1 py-0.5"
                        defaultValue={c.marginPct ?? ""}
                        onBlur={(e) => {
                          const v = parseFloat(e.target.value);
                          if (!isNaN(v) && v !== c.marginPct) patch(c.id, { marginPct: v });
                        }} />
                      <span className="text-gray-400 text-xs ml-1">%</span>
                    </td>
                    <td className="py-2">
                      <select className="text-sm bg-transparent border-none focus:outline-none"
                        value={c.status}
                        onChange={(e) => patch(c.id, { status: e.target.value })}>
                        <option value="Active">Active</option>
                        <option value="Pending">Pending</option>
                        <option value="Blocked">Blocked</option>
                      </select>
                    </td>
                    <td className="py-2 text-gray-500 text-xs">{c.lastLogin ? new Date(c.lastLogin).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-gray-400 mt-4">Edits save on blur. Margin changes apply to the client&apos;s next rate calculation.</p>
      </Card>
    </div>
  );
}
