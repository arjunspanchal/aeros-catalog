"use client";
import { useEffect, useMemo, useState } from "react";
import { Card, inputCls } from "@/app/calculator/_components/ui";

export default function QuoteHistoryTable({ showClientColumn }) {
  const [quotes, setQuotes] = useState(null);
  const [q, setQ] = useState("");

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
            {filtered.map((q) => (
              <tr key={q.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-2 text-gray-500 text-xs">{q.date}</td>
                <td className="py-2 font-medium">{q.quoteRef}</td>
                <td className="py-2">
                  <span className="inline-flex gap-1 items-center">
                    <span className="text-gray-700">{q.bagType}</span>
                    <span className="text-xs text-gray-400">{q.plainPrinted}</span>
                  </span>
                </td>
                <td className="py-2 text-gray-500 text-xs">{[q.brand, q.item].filter(Boolean).join(" · ") || "—"}</td>
                <td className="py-2 text-gray-500 text-xs">
                  {q.width}×{q.gusset}×{q.height}mm · {q.gsm}G{q.bf ? `/${q.bf}BF` : ""}
                </td>
                <td className="py-2 text-right">{q.orderQty ? q.orderQty.toLocaleString() : "—"}</td>
                <td className="py-2 text-right">{q.sellingPrice != null ? `₹${Number(q.sellingPrice).toFixed(2)}` : "—"}</td>
                <td className="py-2 text-right font-medium">{q.orderTotal != null ? `₹${Number(q.orderTotal).toLocaleString("en-IN")}` : "—"}</td>
                {showClientColumn && <td className="py-2 text-gray-500 text-xs">{q.clientEmail || q.generatedBy}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No matches.</p>}
    </Card>
  );
}
