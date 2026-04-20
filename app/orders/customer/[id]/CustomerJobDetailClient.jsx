"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { StageBadge, StageTimeline, formatDate, formatDateTime } from "@/app/orders/_components/ui";

export default function CustomerJobDetailClient({ initialJob, initialUpdates }) {
  const router = useRouter();
  const [job, setJob] = useState(initialJob);
  const [updates, setUpdates] = useState(initialUpdates);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function toggleUrgent() {
    setErr(""); setBusy(true);
    const next = !job.urgent;
    const res = await fetch(`/api/orders/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urgent: next }),
    });
    setBusy(false);
    if (!res.ok) { setErr((await res.json()).error || "Failed"); return; }
    const data = await res.json();
    setJob(data.job);
    setUpdates((prev) => [
      {
        id: `local-${Date.now()}`,
        stage: job.stage,
        note: next ? "Customer marked order URGENT" : "Customer cleared urgent flag",
        updatedByEmail: "",
        updatedByName: "",
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    router.refresh();
  }

  async function markDelivered() {
    if (!window.confirm("Mark this order as delivered? Aeros will be notified.")) return;
    setErr(""); setBusy(true);
    const res = await fetch(`/api/orders/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: "Delivered", note: "Customer confirmed delivery" }),
    });
    setBusy(false);
    if (!res.ok) { setErr((await res.json()).error || "Failed"); return; }
    const data = await res.json();
    setJob(data.job);
    setUpdates((prev) => [
      {
        id: `local-${Date.now()}`,
        stage: "Delivered",
        note: "Customer confirmed delivery",
        updatedByEmail: "",
        updatedByName: "",
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    router.refresh();
  }

  const canMarkDelivered = job.stage === "Dispatched";
  const delivered = job.stage === "Delivered";

  return (
    <>
      <div className="mt-4 bg-white border border-gray-200 rounded-xl p-5 dark:bg-gray-900 dark:border-gray-800">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {job.urgent && <span className="inline-flex items-center gap-1 text-xs font-semibold bg-red-100 text-red-800 px-2 py-0.5 rounded-md mr-2 align-middle dark:bg-red-900/40 dark:text-red-200">URGENT</span>}
              {job.item}
            </h1>
            <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">
              J# {job.jNumber}{job.brand && <> · {job.brand}</>}{job.city && <> · {job.city}</>}
            </p>
          </div>
          <StageBadge stage={job.stage} />
        </div>

        <div className="mt-5">
          <StageTimeline stage={job.stage} />
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Current: {job.stage}</span>
            {job.estimatedDeliveryDate && <span>ETA {formatDate(job.estimatedDeliveryDate)}</span>}
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          {job.qty != null && <>
            <dt className="text-gray-500 dark:text-gray-400">Quantity</dt>
            <dd className="text-gray-900 dark:text-white">{job.qty.toLocaleString("en-IN")} pcs</dd>
          </>}
          {job.itemSize && <>
            <dt className="text-gray-500 dark:text-gray-400">Item size</dt>
            <dd className="text-gray-900 dark:text-white">{job.itemSize}</dd>
          </>}
          {job.category && <>
            <dt className="text-gray-500 dark:text-gray-400">Category</dt>
            <dd className="text-gray-900 dark:text-white">{job.category}</dd>
          </>}
          {job.poNumber && <>
            <dt className="text-gray-500 dark:text-gray-400">PO number</dt>
            <dd className="text-gray-900 dark:text-white">{job.poNumber}</dd>
          </>}
          {job.orderDate && <>
            <dt className="text-gray-500 dark:text-gray-400">Order date</dt>
            <dd className="text-gray-900 dark:text-white">{formatDate(job.orderDate)}</dd>
          </>}
          {job.estimatedDeliveryDate && <>
            <dt className="text-gray-500 dark:text-gray-400">Estimated delivery</dt>
            <dd className="text-gray-900 dark:text-white">{formatDate(job.estimatedDeliveryDate)}</dd>
          </>}
        </dl>

        {job.lrFiles && job.lrFiles.length > 0 && (
          <div className="mt-5 border-t border-gray-100 dark:border-gray-800 pt-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Dispatch documents (LR)</h3>
            <ul className="space-y-1.5">
              {job.lrFiles.map((f) => (
                <li key={f.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300 truncate">{f.filename}</span>
                  <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline dark:text-blue-400 ml-3 shrink-0">
                    Download ↗
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {job.notes && (
          <div className="mt-5 rounded-lg bg-blue-50 border border-blue-100 p-3 text-sm text-blue-900 dark:bg-blue-950/40 dark:border-blue-900 dark:text-blue-100">
            {job.notes}
          </div>
        )}

        <div className="mt-5 border-t border-gray-100 dark:border-gray-800 pt-5">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!job.urgent}
              disabled={busy}
              onChange={toggleUrgent}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            <div className="text-sm">
              <div className="font-medium text-gray-900 dark:text-white">Mark order urgent</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Flags this order as urgent for Aeros. Visible to their whole team.
              </div>
            </div>
          </label>
        </div>

        {(canMarkDelivered || delivered) && (
          <div className="mt-5 border-t border-gray-100 dark:border-gray-800 pt-5">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={delivered}
                disabled={delivered || busy}
                onChange={markDelivered}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="text-sm">
                <div className="font-medium text-gray-900 dark:text-white">
                  {delivered ? "Delivered" : "Mark as delivered"}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {delivered
                    ? "Thanks for confirming."
                    : "Check this once the order has reached you. Aeros sees this instantly."}
                </div>
              </div>
            </label>
            {err && <p className="text-xs text-red-500 mt-2">{err}</p>}
          </div>
        )}
      </div>

      <div className="mt-6 bg-white border border-gray-200 rounded-xl p-5 dark:bg-gray-900 dark:border-gray-800">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Timeline</h2>
        {updates.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">No updates yet.</p>
        )}
        <ol className="space-y-3">
          {updates.map((u) => (
            <li key={u.id} className="flex items-start gap-3">
              <div className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm">
                  <StageBadge stage={u.stage} />
                  <span className="text-xs text-gray-500 dark:text-gray-400">{formatDateTime(u.createdAt)}</span>
                </div>
                {u.note && <p className="text-sm text-gray-700 mt-1 dark:text-gray-300">{u.note}</p>}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}
