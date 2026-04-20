"use client";
import { useState } from "react";
import { inputCls, labelCls } from "@/app/orders/_components/ui";
import { ROLES, ROLE_OPTIONS } from "@/lib/orders/constants";

const EMPTY = { email: "", name: "", role: ROLES.CUSTOMER, clientIds: [] };

export default function UsersAdmin({ initialUsers, clients }) {
  const [users, setUsers] = useState(initialUsers);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c]));

  const isEditing = editingId !== null;
  const needsClient = form.role === ROLES.CUSTOMER;
  const allowedRoleOptions = ROLE_OPTIONS.filter((o) => o.value !== ROLES.ADMIN);

  function startEdit(u) {
    setEditingId(u.id);
    setForm({
      email: u.email,
      name: u.name || "",
      role: u.role,
      clientIds: u.clientIds || [],
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
    const url = isEditing ? `/api/orders/users/${editingId}` : "/api/orders/users";
    const method = isEditing ? "PATCH" : "POST";
    const body = isEditing
      ? { name: form.name, role: form.role, clientIds: form.clientIds }
      : form;
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) { setErr((await res.json()).error || "Failed"); return; }
    const data = await res.json();
    if (isEditing) {
      setUsers((prev) => prev.map((u) => (u.id === editingId ? data.user : u)).sort((a, b) => a.email.localeCompare(b.email)));
    } else {
      setUsers((prev) => [...prev, data.user].sort((a, b) => a.email.localeCompare(b.email)));
    }
    cancelEdit();
  }

  async function toggleActive(user) {
    const res = await fetch(`/api/orders/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !user.active }),
    });
    if (!res.ok) return;
    const data = await res.json();
    setUsers((prev) => prev.map((u) => (u.id === user.id ? data.user : u)));
  }

  return (
    <div className="mt-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
      <form onSubmit={submit} className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5 space-y-3 dark:bg-gray-900 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            {isEditing ? "Edit user" : "Invite user"}
          </h2>
          {isEditing && (
            <button type="button" onClick={cancelEdit} className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              Cancel
            </button>
          )}
        </div>
        <div>
          <label className={labelCls}>Email</label>
          <input
            type="email"
            className={inputCls}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            disabled={isEditing}
          />
          {isEditing && <p className="text-xs text-gray-400 mt-1 dark:text-gray-500">Email can't be changed. Remove + re-invite if needed.</p>}
        </div>
        <div>
          <label className={labelCls}>Name</label>
          <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Vinay" />
        </div>
        <div>
          <label className={labelCls}>Role</label>
          <select className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {allowedRoleOptions.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        {(needsClient || form.role === ROLES.ACCOUNT_MANAGER) && (
          <div>
            <label className={labelCls}>{needsClient ? "Client" : "Assigned clients"}</label>
            <select
              multiple={form.role === ROLES.ACCOUNT_MANAGER}
              className={`${inputCls} ${form.role === ROLES.ACCOUNT_MANAGER ? "min-h-32" : ""}`}
              value={needsClient ? (form.clientIds[0] || "") : form.clientIds}
              onChange={(e) => {
                if (needsClient) setForm({ ...form, clientIds: e.target.value ? [e.target.value] : [] });
                else setForm({ ...form, clientIds: Array.from(e.target.selectedOptions).map((o) => o.value) });
              }}
              required={needsClient}
            >
              {needsClient && <option value="">Select client…</option>}
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {form.role === ROLES.ACCOUNT_MANAGER && <p className="text-xs text-gray-400 mt-1 dark:text-gray-500">Hold ⌘/Ctrl to select multiple.</p>}
          </div>
        )}
        <button disabled={busy} className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60">
          {busy ? (isEditing ? "Saving…" : "Inviting…") : (isEditing ? "Save changes" : "Invite")}
        </button>
        {err && <p className="text-xs text-red-500">{err}</p>}
      </form>

      <div className="lg:col-span-3 bg-white border border-gray-200 rounded-xl overflow-hidden dark:bg-gray-900 dark:border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase dark:bg-gray-800/50 dark:text-gray-400">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Email</th>
              <th className="text-left px-4 py-2 font-medium">Name</th>
              <th className="text-left px-4 py-2 font-medium">Role</th>
              <th className="text-left px-4 py-2 font-medium">Client(s)</th>
              <th className="text-right px-4 py-2 font-medium">Status</th>
              <th className="text-right px-4 py-2 font-medium">&nbsp;</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {users.map((u) => (
              <tr key={u.id} className={editingId === u.id ? "bg-blue-50 dark:bg-blue-900/20" : ""}>
                <td className="px-4 py-2 text-gray-900 dark:text-white">{u.email}</td>
                <td className="px-4 py-2 text-gray-600 dark:text-gray-300">{u.name || "—"}</td>
                <td className="px-4 py-2 text-xs text-gray-600 capitalize dark:text-gray-300">{u.role.replace("_", " ")}</td>
                <td className="px-4 py-2 text-xs text-gray-600 dark:text-gray-300">
                  {u.clientIds.map((cid) => clientMap[cid]?.name).filter(Boolean).join(", ") || "—"}
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => toggleActive(u)}
                    className={`text-xs px-2 py-1 rounded-md ${u.active ? "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300" : "bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300"}`}
                  >
                    {u.active ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => startEdit(u)} className="text-xs text-blue-600 hover:underline dark:text-blue-400">
                    Edit
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={6} className="text-center text-sm text-gray-500 py-8 dark:text-gray-400">No users yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
