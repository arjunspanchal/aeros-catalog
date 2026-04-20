"use client";
import { useState } from "react";
import { inputCls, labelCls, formatDateTime } from "@/app/orders/_components/ui";

const MAX_BYTES = 5 * 1024 * 1024;

function readAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result || "";
      const idx = String(res).indexOf(",");
      resolve(String(res).slice(idx + 1));
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function CustomerPOsClient({ initialPOs }) {
  const [pos, setPos] = useState(initialPOs);
  const [poNumber, setPoNumber] = useState("");
  const [file, setFile] = useState(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function upload(e) {
    e.preventDefault();
    setErr("");
    if (!file) { setErr("Pick a PDF"); return; }
    if (file.type !== "application/pdf") { setErr("Only PDF files"); return; }
    if (file.size > MAX_BYTES) { setErr("File too large. Max 5 MB."); return; }
    if (!poNumber.trim()) { setErr("Enter the PO number"); return; }

    setBusy(true);
    const base64 = await readAsBase64(file);
    const res = await fetch("/api/orders/customer-pos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        poNumber: poNumber.trim(),
        filename: file.name,
        contentType: file.type,
        fileBase64: base64,
        notes: notes.trim(),
      }),
    });
    setBusy(false);
    if (!res.ok) { setErr((await res.json()).error || "Upload failed"); return; }

    // Re-fetch list so the new attachment URL comes back.
    const list = await fetch("/api/orders/customer-pos").then((r) => r.json());
    setPos(list.pos || []);
    setPoNumber(""); setFile(null); setNotes("");
    if (e.target instanceof HTMLFormElement) e.target.reset();
  }

  return (
    <div className="mt-6 space-y-6">
      <form onSubmit={upload} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 dark:bg-gray-900 dark:border-gray-800">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Upload a PO</h2>
        <div>
          <label className={labelCls}>PO number</label>
          <input
            className={inputCls}
            value={poNumber}
            onChange={(e) => setPoNumber(e.target.value)}
            placeholder="e.g. AB-2026-042"
            required
          />
          <p className="text-xs text-gray-400 mt-1 dark:text-gray-500">Used for searching later. Must match what you use on the order.</p>
        </div>
        <div>
          <label className={labelCls}>PDF file</label>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-3 file:border-0 file:rounded-md file:bg-blue-600 file:text-white file:text-sm hover:file:bg-blue-700 dark:text-gray-300"
            required
          />
          <p className="text-xs text-gray-400 mt-1 dark:text-gray-500">Max 5 MB.</p>
        </div>
        <div>
          <label className={labelCls}>Notes (optional)</label>
          <textarea rows={2} className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <button disabled={busy} className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60">
          {busy ? "Uploading…" : "Upload PO"}
        </button>
        {err && <p className="text-xs text-red-500">{err}</p>}
      </form>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden dark:bg-gray-900 dark:border-gray-800">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Uploaded ({pos.length})</h2>
        </div>
        {pos.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">Nothing uploaded yet.</div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {pos.map((p) => (
              <li key={p.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">PO {p.poNumber}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {p.fileName || "—"} · {formatDateTime(p.createdAt)}
                  </div>
                  {p.notes && <div className="text-xs text-gray-500 mt-0.5 dark:text-gray-400">{p.notes}</div>}
                </div>
                {p.fileUrl ? (
                  <a
                    href={p.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline dark:text-blue-400 whitespace-nowrap"
                  >
                    Download ↗
                  </a>
                ) : (
                  <span className="text-xs text-gray-400 dark:text-gray-500">processing…</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
