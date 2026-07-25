"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

function fmt(n, dp = 2) {
  if (n == null) return "—";
  return Number(n).toLocaleString("en-IN", { minimumFractionDigits: dp, maximumFractionDigits: dp });
}
function fmtInt(n) {
  if (n == null) return "—";
  return Number(n).toLocaleString("en-IN");
}
function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ManifestListClient({ manifests = [] }) {
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return manifests;
    return manifests.filter((m) =>
      [m.manifest_no, m.reference, m.invoice_numbers, m.consignees, m.vehicle_size, m.vehicle_number]
        .filter(Boolean).join(" ").toLowerCase().includes(needle),
    );
  }, [manifests, q]);

  const totals = useMemo(() => {
    let boxes = 0, kg = 0, cbm = 0;
    for (const m of rows) {
      boxes += m.total_boxes || 0;
      kg += m.total_kg || 0;
      cbm += m.total_cbm || 0;
    }
    return { boxes, kg: +kg.toFixed(2), cbm: +cbm.toFixed(3) };
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search manifest no., reference, invoice, consignee, vehicle…"
          className="min-w-[280px] flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-gray-400 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
        />
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {rows.length} {rows.length === 1 ? "manifest" : "manifests"}
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-900/60">
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Manifest</th>
              <th className="px-4 py-3">Consignees</th>
              <th className="px-4 py-3">Vehicle</th>
              <th className="px-4 py-3 text-right">Types</th>
              <th className="px-4 py-3 text-right">Boxes</th>
              <th className="px-4 py-3 text-right">Pcs</th>
              <th className="px-4 py-3 text-right">Kg</th>
              <th className="px-4 py-3 text-right">CBM</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm dark:divide-gray-800">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                  No manifests yet — hit “New manifest” to build one.
                </td>
              </tr>
            ) : rows.map((m) => (
              <tr key={m.manifest_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                <td className="whitespace-nowrap px-4 py-3 text-gray-600 dark:text-gray-300">{fmtDate(m.manifest_date)}</td>
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                  {m.manifest_no}
                  {m.reference && <div className="text-[11px] font-normal text-gray-400">{m.reference}</div>}
                  {m.invoice_numbers && (
                    <div className="text-[11px] font-normal text-gray-400">{m.invoice_numbers}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                  {m.consignees || "—"}
                  {m.invoice_count > 1 && (
                    <div className="text-[11px] text-gray-400">{m.invoice_count} invoices</div>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-600 dark:text-gray-300">
                  {m.vehicle_size || "—"}
                  {m.vehicle_number && <div className="text-[11px] text-gray-400">{m.vehicle_number}</div>}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-600 dark:text-gray-300">{fmtInt(m.line_count)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-900 dark:text-gray-100">{fmtInt(m.total_boxes)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-600 dark:text-gray-300">{m.total_pcs ? fmtInt(m.total_pcs) : "—"}</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-900 dark:text-gray-100">
                  {fmt(m.total_kg)}
                  {m.missing_kg > 0 && <div className="text-[11px] font-normal text-amber-600">+{m.missing_kg} unpriced</div>}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-900 dark:text-gray-100">
                  {fmt(m.total_cbm, 3)}
                  {m.missing_cbm > 0 && <div className="text-[11px] font-normal text-amber-600">+{m.missing_cbm} no size</div>}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <Link href={`/warehouse/manifests/${m.manifest_id}`} className="text-sm font-medium text-blue-700 hover:text-blue-800 dark:text-blue-400">
                    Open
                  </Link>
                  <a
                    href={`/print/manifest/${m.manifest_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-3 text-sm font-medium text-gray-600 hover:text-gray-800 dark:text-gray-300"
                  >
                    PDF
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="border-t border-gray-200 bg-gray-50 text-sm font-medium dark:border-gray-800 dark:bg-gray-900/60">
              <tr className="text-gray-700 dark:text-gray-200">
                <td className="px-4 py-3" colSpan={5}>Totals ({rows.length})</td>
                <td className="px-4 py-3 text-right tabular-nums">{fmtInt(totals.boxes)}</td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3 text-right tabular-nums">{fmt(totals.kg)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{fmt(totals.cbm, 3)}</td>
                <td className="px-4 py-3" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
