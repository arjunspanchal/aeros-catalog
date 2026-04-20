"use client";
import { useEffect, useState } from "react";
import { Card, inputCls } from "@/app/calculator/_components/ui";

export default function ClientsAdmin() {
  const [clients, setClients] = useState(null);
  const [saving, setSaving] = useState({});

  useEffect(() => {
    fetch("/api/calc/clients").then((r) => r.ok ? r.json() : []).then(setClients).catch(() => setClients([]));
  }, []);

  async function patch(id, updates) {
    setSaving((s) => ({ ...s, [id]: true }));
    const res = await fetch("/api/calc/clients", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    if (res.ok) {
      const updated = await res.json();
      setClients((cs) => cs.map((c) => (c.id === id ? updated : c)));
    }
    setSaving((s) => ({ ...s, [id]: false }));
  }

  if (clients === null) return <Card><p className="text-sm text-gray-500">Loading…</p></Card>;
  if (clients.length === 0) return <Card><p className="text-sm text-gray-500">No clients yet. They&apos;ll appear here after first login.</p></Card>;

  return (
    <Card>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
            <th className="text-left pb-2 font-medium">Email</th>
            <th className="text-left pb-2 font-medium">Name</th>
            <th className="text-left pb-2 font-medium">Company</th>
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
                <input
                  className="text-sm bg-transparent border-b border-transparent hover:border-gray-200 focus:border-blue-500 focus:outline-none px-1 py-0.5 w-32"
                  defaultValue={c.name}
                  onBlur={(e) => e.target.value !== c.name && patch(c.id, { name: e.target.value })}
                />
              </td>
              <td className="py-2">
                <input
                  className="text-sm bg-transparent border-b border-transparent hover:border-gray-200 focus:border-blue-500 focus:outline-none px-1 py-0.5 w-32"
                  defaultValue={c.company}
                  onBlur={(e) => e.target.value !== c.company && patch(c.id, { company: e.target.value })}
                />
              </td>
              <td className="py-2 text-right">
                <input
                  type="number" step="0.5"
                  className="w-16 text-right text-sm bg-transparent border-b border-transparent hover:border-gray-200 focus:border-blue-500 focus:outline-none px-1 py-0.5"
                  defaultValue={c.marginPct ?? ""}
                  onBlur={(e) => {
                    const v = parseFloat(e.target.value);
                    if (!isNaN(v) && v !== c.marginPct) patch(c.id, { marginPct: v });
                  }}
                />
                <span className="text-gray-400 text-xs ml-1">%</span>
              </td>
              <td className="py-2">
                <select
                  className="text-sm bg-transparent border-none focus:outline-none"
                  value={c.status}
                  onChange={(e) => patch(c.id, { status: e.target.value })}
                >
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
      <p className="text-xs text-gray-400 mt-4">Edits save on blur. Margin changes apply to the client&apos;s next login.</p>
    </Card>
  );
}
