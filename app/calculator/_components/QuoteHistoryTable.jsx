"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, inputCls } from "@/app/calculator/_components/ui";

// One detail row per field we want to show in the expanded view. `skip` means
// hide if the value is falsy/empty.
const DETAIL_FIELDS = [
  { key: "quoteRef", label: "Quote ref" },
  { key: "date", label: "Date" },
  { key: "brand", label: "Brand", skipIfEmpty: true },
  { key: "item", label: "Item", skipIfEmpty: true },
  { key: "bagType", label: "Bag type" },
  { key: "plainPrinted", label: "Plain/Printed" },
  { key: "colours", label: "Colours", skipIfEmpty: true },
  { key: "coveragePct", label: "Coverage %", skipIfEmpty: true, suffix: "%" },
  { key: "dimensions", label: "Dimensions (W × G × H mm)", compute: (q) => `${q.width} × ${q.gusset} × ${q.height}` },
  { key: "paperType", label: "Paper type", skipIfEmpty: true },
  { key: "mill", label: "Mill", skipIfEmpty: true },
  { key: "gsm", label: "GSM" },
  { key: "bf", label: "BF", skipIfEmpty: true, suffix: " BF" },
  { key: "casePack", label: "Case pack" },
  { key: "orderQty", label: "Order qty", format: (v) => v?.toLocaleString() },
  { key: "handleCost", label: "Handle cost / bag", skipIfEmpty: true, format: (v) => `₹${Number(v).toFixed(2)}` },
  { key: "wastagePct", label: "Wastage %", skipIfEmpty: true, suffix: "%" },
  { key: "profitPct", label: "Profit %", skipIfEmpty: true, suffix: "%" },
  { key: "paperRate", label: "Paper rate (₹/kg)", skipIfEmpty: true, format: (v) => `₹${Number(v).toFixed(2)}` },
  { key: "mfgCost", label: "Mfg cost / bag", skipIfEmpty: true, format: (v) => `₹${Number(v).toFixed(4)}` },
  { key: "sellingPrice", label: "Selling price / bag", highlight: true, format: (v) => `₹${Number(v).toFixed(4)}` },
  { key: "costPerCase", label: "Cost / case", format: (v) => `₹${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
  { key: "orderTotal", label: "Order total", highlight: true, format: (v) => `₹${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
];

function DetailView({ quote, showClientColumn }) {
  const rows = DETAIL_FIELDS.map((f) => {
    const raw = f.compute ? f.compute(quote) : quote[f.key];
    if (f.skipIfEmpty && (raw === null || raw === undefined || raw === "" || raw === 0)) return null;
    const display = raw === null || raw === undefined || raw === "" ? "—"
      : f.format ? f.format(raw)
      : f.suffix ? `${raw}${f.suffix}`
      : raw;
    return { label: f.label, value: display, highlight: f.highlight };
  }).filter(Boolean);

  return (
    <div className="bg-gray-50 p-4 border-b border-gray-100">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between text-sm py-1 border-b border-gray-100">
            <span className="text-gray-500">{r.label}</span>
            <span className={r.highlight ? "font-semibold text-blue-700" : "text-gray-900"}>{r.value}</span>
          </div>
        ))}
        {showClientColumn && quote.clientEmail && (
          <div className="flex justify-between text-sm py-1 border-b border-gray-100">
            <span className="text-gray-500">Client email</span>
            <span className="text-gray-900 break-all">{quote.clientEmail}</span>
          </div>
        )}
      </div>
      {quote.notes && (
        <div className="mt-3 text-sm">
          <span className="text-gray-500">Notes: </span>
          <span className="text-gray-800">{quote.notes}</span>
        </div>
      )}
    </div>
  );
}

export default function QuoteHistoryTable({ showClientColumn }) {
  const [quotes, setQuotes] = useState(null);
  const [q, setQ] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetch("/api/calc/quotes").then((r) => r.ok ? r.json() : []).then(setQuotes).catch(() => setQuotes([]));
  }, []);

  const filtered = useMemo(() => {
    if (!quotes) return null;
    const needle = q.trim().toLowerCase();
    if (!needle) return quotes;
    return quotes.filter((x) =>
      [x.quoteRef, x.brand, x.item, x.bagType, x.plainPrinted, x.clientEmail, x.mill]
        .filter(Boolean).some((s) => String(s).toLowerCase().includes(needle)),
    );
  }, [quotes, q]);

  if (quotes === null) return <Card><p className="text-sm text-gray-500">Loading…</p></Card>;
  if (quotes.length === 0) return <Card><p className="text-sm text-gray-500">No quotes saved yet.</p></Card>;

  const colspan = showClientColumn ? 9 : 8;

  return (
    <Card>
      <input className={`${inputCls} mb-4`} placeholder="Search by ref, brand, item, bag type…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
              <th className="text-left pb-2 font-medium">Date</th>
              <th className="text-left pb-2 font-medium">Ref</th>
              <th className="text-left pb-2 font-medium">Bag</th>
              <th className="text-left pb-2 font-medium">Brand · Item</th>
              <th className="text-left pb-2 font-medium">Specs</th>
              <th className="text-right pb-2 font-medium">Qty</th>
              <th className="text-right pb-2 font-medium">Rate</th>
              <th className="text-right pb-2 font-medium">Order Total</th>
              {showClientColumn && <th className="text-left pb-2 font-medium">Client</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((quote) => {
              const isOpen = expandedId === quote.id;
              return (
                <>
                  <tr key={quote.id}
                    onClick={() => setExpandedId(isOpen ? null : quote.id)}
                    className={`cursor-pointer border-b border-gray-50 hover:bg-gray-50 ${isOpen ? "bg-blue-50/40" : ""}`}>
                    <td className="py-2 text-gray-500 text-xs">{quote.date}</td>
                    <td className="py-2 font-medium">
                      <span className="text-gray-400 mr-1">{isOpen ? "▾" : "▸"}</span>
                      {quote.quoteRef}
                    </td>
                    <td className="py-2">
                      <span className="inline-flex gap-1 items-center">
                        <span className="text-gray-700">{quote.bagType}</span>
                        <span className="text-xs text-gray-400">{quote.plainPrinted}</span>
                      </span>
                    </td>
                    <td className="py-2 text-gray-500 text-xs">{[quote.brand, quote.item].filter(Boolean).join(" · ") || "—"}</td>
                    <td className="py-2 text-gray-500 text-xs">
                      {quote.width}×{quote.gusset}×{quote.height}mm · {quote.gsm}G{quote.bf ? `/${quote.bf}BF` : ""}
                    </td>
                    <td className="py-2 text-right">{quote.orderQty ? quote.orderQty.toLocaleString() : "—"}</td>
                    <td className="py-2 text-right">{quote.sellingPrice != null ? `₹${Number(quote.sellingPrice).toFixed(2)}` : "—"}</td>
                    <td className="py-2 text-right font-medium">{quote.orderTotal != null ? `₹${Number(quote.orderTotal).toLocaleString("en-IN")}` : "—"}</td>
                    {showClientColumn && <td className="py-2 text-gray-500 text-xs">{quote.clientEmail || quote.generatedBy}</td>}
                  </tr>
                  {isOpen && (
                    <tr key={`${quote.id}-detail`}>
                      <td colSpan={colspan} className="p-0">
                        <DetailView quote={quote} showClientColumn={showClientColumn} />
                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
                          <Link href={showClientColumn ? `/calculator/admin?quote=${quote.id}` : `/calculator/client?quote=${quote.id}`}
                            className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">
                            Re-open in calculator
                          </Link>
                          <span className="text-xs text-gray-400">Opens the calculator pre-filled with this quote so you can update or save as new.</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No matches.</p>}
    </Card>
  );
}
