"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { StageBadge, StageTimeline, formatDate } from "@/app/orders/_components/ui";

export default function CustomerJobsView({ jobs, clientMap }) {
  const [filter, setFilter] = useState("open");

  const filtered = useMemo(() => {
    if (filter === "all") return jobs;
    if (filter === "open") return jobs.filter((j) => j.stage !== "Dispatched");
    if (filter === "dispatched") return jobs.filter((j) => j.stage === "Dispatched");
    return jobs;
  }, [jobs, filter]);

  // Group by PO Number so orders like "aB Coffee PO-42: cups + lids + foils" show together.
  const grouped = useMemo(() => {
    const map = new Map();
    for (const j of filtered) {
      const key = j.poNumber || `__J${j.jNumber}`;
      if (!map.has(key)) map.set(key, { poNumber: j.poNumber, jobs: [] });
      map.get(key).jobs.push(j);
    }
    return Array.from(map.values()).sort((a, b) =>
      (b.jobs[0]?.orderDate || "").localeCompare(a.jobs[0]?.orderDate || ""),
    );
  }, [filtered]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Your orders</h1>
        <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1 text-xs dark:bg-gray-900 dark:border-gray-800">
          {[
            ["open", "In progress"],
            ["dispatched", "Dispatched"],
            ["all", "All"],
          ].map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`px-3 py-1.5 rounded-md font-medium ${
                filter === k ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {grouped.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-sm text-gray-500 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-400">
          No orders to show.
        </div>
      )}

      <div className="space-y-4">
        {grouped.map((g) => (
          <div key={g.poNumber || g.jobs[0].id} className="bg-white border border-gray-200 rounded-xl overflow-hidden dark:bg-gray-900 dark:border-gray-800">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between dark:bg-gray-800/50 dark:border-gray-800">
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  {g.poNumber ? `PO ${g.poNumber}` : `Job ${g.jobs[0].jNumber}`}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {g.jobs.length} {g.jobs.length === 1 ? "item" : "items"} · Placed {formatDate(g.jobs[0].orderDate)}
                </div>
              </div>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {g.jobs.map((j) => (
                <Link
                  key={j.id}
                  href={`/orders/customer/${j.id}`}
                  className="block px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {j.item}
                        {j.brand && <span className="text-gray-500 dark:text-gray-400"> · {j.brand}</span>}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 dark:text-gray-400">
                        J# {j.jNumber}
                        {j.city && <> · {j.city}</>}
                        {j.qty != null && <> · {j.qty.toLocaleString("en-IN")} pcs</>}
                      </div>
                    </div>
                    <StageBadge stage={j.stage} />
                  </div>
                  <div className="mt-3">
                    <StageTimeline stage={j.stage} />
                    <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>Current: {j.stage}</span>
                      {j.expectedDispatchDate && <span>Dispatch by {formatDate(j.expectedDispatchDate)}</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
