"use client";
import { useMemo, useState } from "react";
import { inputCls, formatDateTime } from "@/app/orders/_components/ui";

export default function ManagerPOsView({ pos, clientMap }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return pos;
    return pos.filter((p) => {
      const clientName = p.clientIds.map((c) => clientMap[c]?.name || "").join(" ");
      const hay = `${p.poNumber} ${p.fileName || ""} ${clientName} ${p.uploadedByEmail}`.toLowerCase();
      return hay.includes(term);
    });
  }, [pos, q, clientMap]);

  return (
    <div className="mt-6 space-y-4">
      <input
        className={inputCls}
        placeholder="Search by PO number, filename, client, uploader…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden dark:bg-gray-900 dark:border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase dark:bg-gray-800/50 dark:text-gray-400">
            <tr>
              <th className="text-left px-4 py-2 font-medium">PO number</th>
              <th className="text-left px-4 py-2 font-medium">Client</th>
              <th className="text-left px-4 py-2 font-medium">Uploaded</th>
              <th className="text-left px-4 py-2 font-medium">File</th>
              <th className="text-right px-4 py-2 font-medium">&nbsp;</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-2 text-gray-900 font-medium dark:text-white">{p.poNumber}</td>
                <td className="px-4 py-2 text-gray-600 dark:text-gray-300">
                  {p.clientIds.map((c) => clientMap[c]?.name).filter(Boolean).join(", ") || "—"}
                </td>
                <td className="px-4 py-2 text-xs text-gray-600 dark:text-gray-300">
                  <div>{formatDateTime(p.createdAt)}</div>
                  {p.uploadedByEmail && <div className="text-gray-400 dark:text-gray-500">{p.uploadedByEmail}</div>}
                </td>
                <td className="px-4 py-2 text-xs text-gray-600 dark:text-gray-300">{p.fileName || "—"}</td>
                <td className="px-4 py-2 text-right">
                  {p.fileUrl ? (
                    <a
                      href={p.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                    >
                      Download ↗
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="text-center text-sm text-gray-500 py-8 dark:text-gray-400">{q ? "Nothing matches." : "No POs uploaded yet."}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
