"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ManifestEditor from "@/app/warehouse/_components/ManifestEditor";

// Standalone manifest builder. Deliberately lean: date, an optional reference
// label and the vehicle — no customer, no freight, no lane. The consignees come
// from the invoices inside the manifest, which is what lets one truck carry
// several customers.
export default function ManifestBuilderClient({
  manifest: initial,
  boxTypes = [],
  initialLines = [],
  initialInvoices = [],
  clients = [],
  history = [],
  vehicleSizes = [],
  isAdmin = false,
}) {
  const router = useRouter();
  const [m, setM] = useState(initial);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  // Header fields save with the manifest body (one PUT), so they're held here
  // and handed to the editor as extraPayload.
  const [header, setHeader] = useState({
    manifest_date: initial.manifest_date || "",
    reference: initial.reference || "",
    vehicle_size: initial.vehicle_size || "",
    vehicle_number: initial.vehicle_number || "",
  });

  function setField(k, v) { setHeader((h) => ({ ...h, [k]: v })); }

  async function onDelete() {
    if (!confirm(`Delete ${m.manifest_no}? Its invoices and box types go with it.`)) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/warehouse/manifests/${m.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to delete");
      }
      router.push("/warehouse/manifests");
      router.refresh();
    } catch (e) {
      setError(e.message);
      setDeleting(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-gray-400 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100";
  const labelCls =
    "block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1";

  // Rendered inside the editor card, above the invoices table.
  const headerSlot = (
    <div className="mb-4 grid grid-cols-1 gap-4 rounded-lg border border-gray-200 bg-gray-50 p-3 sm:grid-cols-4 dark:border-gray-800 dark:bg-gray-950">
      <div>
        <label className={labelCls}>Date</label>
        <input type="date" value={header.manifest_date}
          onChange={(e) => setField("manifest_date", e.target.value)} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Reference (optional)</label>
        <input value={header.reference} onChange={(e) => setField("reference", e.target.value)}
          placeholder="e.g. Pune run — Zepto + HoB" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Vehicle size</label>
        <select value={header.vehicle_size} onChange={(e) => setField("vehicle_size", e.target.value)} className={inputCls}>
          <option value="">— Select size —</option>
          {vehicleSizes.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>
      <div>
        <label className={labelCls}>Vehicle number</label>
        <input value={header.vehicle_number} onChange={(e) => setField("vehicle_number", e.target.value)}
          placeholder="e.g. MH04 AB 1234" className={inputCls} />
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link href="/warehouse/manifests" className="text-sm text-blue-700 hover:text-blue-800 dark:text-blue-400">
            ← Manifest generator
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{m.manifest_no}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Add every invoice on the truck and the boxes going against each — the totals and the
            vehicle that fits are worked out below.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={onDelete}
            disabled={deleting}
            className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/50 dark:bg-gray-900 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
      )}

      <ManifestEditor
        saveUrl={`/api/warehouse/manifests/${m.id}/content`}
        printUrl={`/print/manifest/${m.id}`}
        currentVehicleSize={header.vehicle_size}
        boxTypes={boxTypes}
        initialLines={initialLines}
        initialInvoices={initialInvoices}
        clients={clients}
        history={history}
        headerSlot={headerSlot}
        extraPayload={{ header, manifestNo: m.manifest_no }}
        onSaved={(data) => {
          if (!data?.manifest) return;
          setM(data.manifest);
          // The server may have set the vehicle (accepting the suggestion) —
          // pull it back so the header input reflects what was actually saved.
          setHeader((h) => ({ ...h, vehicle_size: data.manifest.vehicle_size || "" }));
        }}
      />
    </div>
  );
}
