"use client";
import { Card } from "@/app/calculator/_components/ui";

// Quantity tiers shown in table columns are the union of all tier qtys across
// items in the same section. Any item with no matching tier gets a "—".
function collectTiers(items) {
  const set = new Set();
  items.forEach((it) => {
    const tiers = it.pricing?.tiers || [];
    tiers.forEach((t) => set.add(t.qty));
  });
  return [...set].sort((a, b) => a - b);
}

function groupBySection(items) {
  const groups = new Map();
  for (const it of items) {
    const key = it.section || "Items";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(it);
  }
  return [...groups.entries()];
}

function formatQty(q) {
  if (q >= 1_000_000) return `${q / 1_000_000}M`;
  if (q >= 1000) return `${q / 1000}k`;
  return String(q);
}

function formatRate(v) {
  if (v === null || v === undefined) return "—";
  return `₹${Number(v).toFixed(2)}`;
}

export default function RateCardView({ items }) {
  if (!items || items.length === 0) {
    return (
      <Card>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No line items on this card yet.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {groupBySection(items).map(([section, rows]) => {
        const tiers = collectTiers(rows);
        return (
          <Card key={section} title={section}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase border-b border-gray-100 dark:text-gray-500 dark:border-gray-800">
                    <th className="text-left pb-2 font-medium">Product</th>
                    <th className="text-left pb-2 font-medium">Material</th>
                    <th className="text-left pb-2 font-medium">Dimensions</th>
                    <th className="text-left pb-2 font-medium">Carton</th>
                    <th className="text-right pb-2 font-medium">Case Pack</th>
                    <th className="text-right pb-2 font-medium">MOQ</th>
                    {tiers.map((q) => (
                      <th key={q} className="text-right pb-2 font-medium">@ {formatQty(q)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((it) => {
                    const rateByQty = new Map((it.pricing?.tiers || []).map((t) => [t.qty, t.rate]));
                    const meta = [it.brand, it.printing, it.productSku && `SKU ${it.productSku}`]
                      .filter(Boolean).join(" · ");
                    return (
                      <tr key={it.id} className="border-b border-gray-50 dark:border-gray-800">
                        <td className="py-2">
                          <div className="font-medium text-gray-900 dark:text-gray-100">{it.productName}</div>
                          {meta && <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{meta}</div>}
                        </td>
                        <td className="py-2 text-gray-600 text-xs dark:text-gray-400">{it.material || "—"}</td>
                        <td className="py-2 text-gray-600 text-xs dark:text-gray-400">{it.dimension || "—"}</td>
                        <td className="py-2 text-gray-600 text-xs dark:text-gray-400">{it.cartonSize || "—"}</td>
                        <td className="py-2 text-right text-gray-600 dark:text-gray-400">{it.casePack ?? "—"}</td>
                        <td className="py-2 text-right text-gray-600 dark:text-gray-400">{it.moq || "—"}</td>
                        {tiers.map((q) => (
                          <td key={q} className="py-2 text-right font-medium text-gray-900 dark:text-gray-100">
                            {formatRate(rateByQty.get(q))}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {rows.some((r) => r.pricing?.mode === "cup_formula") && (
              <p className="text-xs text-gray-400 mt-3 dark:text-gray-500">
                Prices update automatically with current paper rates. Plate charges and setup costs amortise over order qty (higher qty → lower rate).
              </p>
            )}
          </Card>
        );
      })}
    </div>
  );
}
