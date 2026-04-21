"use client";
import { useRef, useState } from "react";
import { inputCls, labelCls } from "@/app/factoryos/_components/ui";
import { ROLES, ROLE_OPTIONS } from "@/lib/factoryos/constants";

const EMPTY = { email: "", name: "", role: ROLES.CUSTOMER, clientIds: [] };

export default function UsersAdmin({ initialUsers, clients }) {
  const [users, setUsers] = useState(initialUsers);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [clientQuery, setClientQuery] = useState("");
  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c]));
  const formRef = useRef(null);

  const isEditing = editingId !== null;
  const needsClient = form.role === ROLES.CUSTOMER;
  const allowedRoleOptions = ROLE_OPTIONS.filter((o) => o.value !== ROLES.ADMIN);

  const q = clientQuery.trim().toLowerCase();
  const selectedClients = clients.filter((c) => form.clientIds.includes(c.id));
  const unselectedClients = clients.filter((c) => !form.clientIds.includes(c.id));
  const filteredUnselected = q
    ? unselectedClients.filter((c) => c.name.toLowerCase().includes(q))
    : unselectedClients;

  function startEdit(u) {
    setEditingId(u.id);
    setForm({
      email: u.email,
      name: u.name || "",
      role: u.role,
      clientIds: u.clientIds || [],
    });
    setErr("");
    setClientQuery("");
    // Pull the edit form into view — easy to miss when it's in the left column.
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY);
    setErr("");
    setClientQuery("");
  }

  async function submit(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    const url = isEditing ? `/api/factoryos/users/${editingId}` : "/api/factoryos/users";
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
    const res = await fetch(`/api/factoryos/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !user.active }),
    });
    if (!res.ok) return;
    const data = await res.json();
    setUsers((prev) => prev.map((u) => (u.id === user.id ? data.user : u)));
  }

  return (
    <div className="mt-6 grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
      <form ref={formRef} onSubmit={submit} className={`lg:col-span-2 bg-white rounded-xl p-4 sm:p-5 space-y-3 dark:bg-gray-900 border-2 lg:sticky lg:top-4 lg:self-start transition-colors ${isEditing ? "border-blue-500 dark:border-blue-400" : "border-gray-200 dark:border-gray-800"}`}>
        <div className="flex items-center justify-between gap-2">
          <h2 className={`text-sm sm:text-base font-semibold ${isEditing ? "text-blue-600 dark:text-blue-400" : "text-gray-900 dark:text-white"}`}>
            {isEditing ? "✏️ Edit user" : "Invite user"}
          </h2>
          {isEditing && (
            <button type="button" onClick={cancelEdit} className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 whitespace-nowrap font-medium">
              ✕ Cancel
            </button>
          )}
        </div>
        {isEditing && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-2 text-xs text-blue-700 dark:text-blue-300">
            Editing: <span className="font-semibold">{form.email}</span>
          </div>
        )}
        <div>
          <label className={labelCls}>Email</label>
          <input
            type="email"
            className={`${inputCls} text-base`}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            disabled={isEditing}
          />
          {isEditing && <p className="text-xs text-gray-400 mt-1 dark:text-gray-500">Email can't be changed. Remove + re-invite if needed.</p>}
        </div>
        <div>
          <label className={labelCls}>Name</label>
          <input className={`${inputCls} text-base`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Vinay" />
        </div>
        <div>
          <label className={labelCls}>Role</label>
          <select className={`${inputCls} text-base`} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {allowedRoleOptions.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        {(needsClient || form.role === ROLES.ACCOUNT_MANAGER) && (
          <div>
            <label className={`${labelCls} flex items-center justify-between gap-2`}>
              <span>{needsClient ? "Client" : "Assigned clients"}</span>
              {!needsClient && form.clientIds.length > 0 && (
                <span className="text-blue-600 dark:text-blue-400 font-medium">
                  {form.clientIds.length} selected
                </span>
              )}
            </label>
            {needsClient ? (
              <select
                className={`${inputCls} text-base`}
                value={form.clientIds[0] || ""}
                onChange={(e) => setForm({ ...form, clientIds: e.target.value ? [e.target.value] : [] })}
                required
              >
                <option value="">Select client…</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="search"
                    value={clientQuery}
                    onChange={(e) => setClientQuery(e.target.value)}
                    placeholder="Search clients…"
                    className={`${inputCls} text-base pl-8`}
                  />
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">🔎</span>
                </div>
                <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-800 rounded-md divide-y divide-gray-100 dark:divide-gray-800">
                  {selectedClients.length > 0 && (
                    <div className="bg-blue-50/60 dark:bg-blue-900/10">
                      {selectedClients.map((c) => (
                        <label
                          key={c.id}
                          className="flex items-center gap-3 cursor-pointer px-3 py-2 hover:bg-blue-100/60 dark:hover:bg-blue-900/20"
                        >
                          <input
                            type="checkbox"
                            checked
                            onChange={() =>
                              setForm({ ...form, clientIds: form.clientIds.filter((id) => id !== c.id) })
                            }
                            className="w-5 h-5 rounded border-gray-300 accent-blue-600 cursor-pointer"
                          />
                          <span className="text-sm sm:text-base text-gray-800 dark:text-gray-200 font-medium">
                            {c.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                  {filteredUnselected.length === 0 && selectedClients.length === 0 && (
                    <p className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                      {q ? "No clients match that search." : "No clients yet."}
                    </p>
                  )}
                  {filteredUnselected.length === 0 && selectedClients.length > 0 && q && (
                    <p className="px-3 py-3 text-xs text-gray-500 dark:text-gray-400 text-center">
                      No other clients match "{clientQuery}".
                    </p>
                  )}
                  {filteredUnselected.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center gap-3 cursor-pointer px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/40"
                    >
                      <input
                        type="checkbox"
                        checked={false}
                        onChange={() => setForm({ ...form, clientIds: [...form.clientIds, c.id] })}
                        className="w-5 h-5 rounded border-gray-300 accent-blue-600 cursor-pointer"
                      />
                      <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300">{c.name}</span>
                    </label>
                  ))}
                </div>
                {form.clientIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, clientIds: [] })}
                    className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
                  >
                    Clear all
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        <button disabled={busy} className={`w-full text-white text-sm sm:text-base font-medium px-4 py-2.5 sm:py-2 rounded-lg touch-none transition-colors ${isEditing ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"} disabled:opacity-60`}>
          {busy ? (isEditing ? "Saving…" : "Inviting…") : (isEditing ? "✓ Save changes" : "Invite")}
        </button>
        {err && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2 text-xs sm:text-sm text-red-700 dark:text-red-300 font-medium">⚠️ {err}</div>}
      </form>

      <div className="lg:col-span-3 space-y-3">
        {/* Desktop table view */}
        <div className="hidden md:block bg-white border border-gray-200 rounded-xl dark:bg-gray-900 dark:border-gray-800" style={{overflow: 'hidden'}}>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase dark:bg-gray-800/50 dark:text-gray-400">
              <tr>
                <th className="text-left px-3 sm:px-4 py-2 font-medium whitespace-nowrap">&nbsp;</th>
                <th className="text-left px-3 sm:px-4 py-2 font-medium whitespace-nowrap">Email</th>
                <th className="text-left px-3 sm:px-4 py-2 font-medium whitespace-nowrap">Role</th>
                <th className="text-left px-3 sm:px-4 py-2 font-medium whitespace-nowrap">Client(s)</th>
                <th className="text-right px-3 sm:px-4 py-2 font-medium whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {users.map((u) => (
                <tr key={u.id} className={editingId === u.id ? "bg-blue-50 dark:bg-blue-900/20" : ""}>
                  <td className="px-3 sm:px-4 py-2">
                    <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center text-[10px] font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-300">
                      {u.photoUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={u.photoUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        (u.name || u.email || "?").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "?"
                      )}
                    </div>
                  </td>
                  <td className="px-3 sm:px-4 py-2 text-sm text-gray-900 dark:text-white whitespace-nowrap">{u.email}</td>
                  <td className="px-3 sm:px-4 py-2 text-xs text-gray-600 capitalize dark:text-gray-300 whitespace-nowrap">{u.role.replace("_", " ")}</td>
                  <td className="px-3 sm:px-4 py-2 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">
                    {u.clientIds.map((cid) => clientMap[cid]?.name).filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-3 sm:px-4 py-2 text-right space-x-2">
                    <button
                      onClick={() => toggleActive(u)}
                      className={`text-xs px-2 py-1 rounded-md ${u.active ? "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300" : "bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300"}`}
                    >
                      {u.active ? "✓" : "✗"}
                    </button>
                    <button onClick={() => startEdit(u)} className="text-xs px-3 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 font-medium">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && <tr><td colSpan={5} className="text-center text-sm text-gray-500 py-8 dark:text-gray-400">No users yet.</td></tr>}
            </tbody>
            </table>
          </div>
        </div>

        {/* Mobile card view */}
        <div className="md:hidden space-y-3">
          {users.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-4 text-center text-sm text-gray-500 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-400">
              No users yet.
            </div>
          ) : (
            users.map((u) => (
              <div
                key={u.id}
                className={`bg-white border border-gray-200 rounded-lg p-4 space-y-3 dark:bg-gray-900 dark:border-gray-800 ${editingId === u.id ? "ring-2 ring-blue-500" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center text-xs font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-300">
                    {u.photoUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={u.photoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      (u.name || u.email || "?").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "?"
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.name || u.email}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{u.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Role</p>
                    <p className="text-gray-900 capitalize dark:text-white">{u.role.replace("_", " ")}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Status</p>
                    <p className={u.active ? "text-green-700 dark:text-green-400" : "text-gray-600 dark:text-gray-300"}>
                      {u.active ? "Active" : "Inactive"}
                    </p>
                  </div>
                </div>
                {u.clientIds.length > 0 && (
                  <div className="text-xs">
                    <p className="text-gray-500 dark:text-gray-400 mb-1">Client(s)</p>
                    <div className="flex flex-wrap gap-1">
                      {u.clientIds.map((cid) => clientMap[cid]?.name).filter(Boolean).map((name) => (
                        <span key={name} className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded dark:bg-blue-900/30 dark:text-blue-300">
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => toggleActive(u)}
                    className={`flex-1 text-xs font-medium px-3 py-2 rounded-md ${u.active ? "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300" : "bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300"}`}
                  >
                    {u.active ? "Active" : "Inactive"}
                  </button>
                  <button
                    onClick={() => startEdit(u)}
                    className="flex-1 text-xs font-medium px-3 py-2 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
