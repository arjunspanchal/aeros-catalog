"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { StageBadge, StageTimeline, inputCls, labelCls, formatDate, formatDateTime } from "@/app/orders/_components/ui";
import { STAGES } from "@/lib/orders/constants";

export default function JobEditor({ job: initialJob, initialUpdates, clientMap, role }) {
  const router = useRouter();
  const [job, setJob] = useState(initialJob);
  const [updates, setUpdates] = useState(initialUpdates);
  const [stage, setStage] = useState(initialJob.stage);
  const [note, setNote] = useState("");
  const [internalStatus, setInternalStatus] = useState(initialJob.internalStatus);
  const [actionPoints, setActionPoints] = useState(initialJob.actionPoints);
  const [expectedDispatchDate, setExpectedDispatchDate] = useState(initialJob.expectedDispatchDate || "");
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState(initialJob.estimatedDeliveryDate || "");
  // RM + production editable fields
  const [rmSupplier, setRmSupplier] = useState(initialJob.rmSupplier);
  const [paperType, setPaperType] = useState(initialJob.paperType);
  const [gsm, setGsm] = useState(initialJob.gsm ?? "");
  const [rmSizeMm, setRmSizeMm] = useState(initialJob.rmSizeMm ?? "");
  const [rmQtySheets, setRmQtySheets] = useState(initialJob.rmQtySheets ?? "");
  const [rmQtyKgs, setRmQtyKgs] = useState(initialJob.rmQtyKgs ?? "");
  const [rmDeliveryDate, setRmDeliveryDate] = useState(initialJob.rmDeliveryDate || "");
  const [printingDueDate, setPrintingDueDate] = useState(initialJob.printingDueDate || "");
  const [productionDueDate, setProductionDueDate] = useState(initialJob.productionDueDate || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [savedAt, setSavedAt] = useState(null);

  const clientName = job.clientIds.map((c) => clientMap[c]?.name).filter(Boolean).join(", ");

  async function save() {
    setErr(""); setBusy(true);
    const res = await fetch(`/api/orders/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stage,
        note: note.trim() || undefined,
        internalStatus,
        actionPoints,
        expectedDispatchDate: expectedDispatchDate || null,
        estimatedDeliveryDate: estimatedDeliveryDate || null,
        rmSupplier,
        paperType,
        gsm: gsm === "" ? null : Number(gsm),
        rmSizeMm: rmSizeMm === "" ? null : Number(rmSizeMm),
        rmQtySheets: rmQtySheets === "" ? null : Number(rmQtySheets),
        rmQtyKgs: rmQtyKgs === "" ? null : Number(rmQtyKgs),
        rmDeliveryDate: rmDeliveryDate || null,
        printingDueDate: printingDueDate || null,
        productionDueDate: productionDueDate || null,
      }),
    });
    setBusy(false);
    if (!res.ok) { setErr((await res.json()).error || "Failed"); return; }
    const data = await res.json();
    setJob(data.job);
    setNote("");
    setSavedAt(new Date());
    router.refresh();
    // Optimistic: push the new update into the timeline locally.
    if (stage !== initialJob.stage || (note && note.trim())) {
      setUpdates((prev) => [
        {
          id: `local-${Date.now()}`,
          stage,
          note: note.trim(),
          updatedByEmail: "",
          updatedByName: "",
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    }
  }

  return (
    <div className="mt-4 space-y-5">
      <div className="bg-white border border-gray-200 rounded-xl p-5 dark:bg-gray-900 dark:border-gray-800">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{job.item}</h1>
            <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">
              J# {job.jNumber}{clientName && <> · {clientName}</>}{job.brand && <> · {job.brand}</>}{job.city && <> · {job.city}</>}
            </p>
          </div>
          <StageBadge stage={job.stage} />
        </div>
        <div className="mt-4">
          <StageTimeline stage={job.stage} />
        </div>

        <dl className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 text-sm">
          <Col label="Quantity" value={job.qty != null ? job.qty.toLocaleString("en-IN") : "—"} />
          <Col label="Category" value={job.category || "—"} />
          <Col label="Item size" value={job.itemSize || "—"} />
          <Col label="PO #" value={job.poNumber || "—"} />
          <Col label="Order date" value={formatDate(job.orderDate)} />
          <Col label="Printing vendor" value={job.printingVendor || "—"} />
          <Col label="Printing type" value={job.printingType || "—"} />
          <Col label="Printing due" value={formatDate(job.printingDueDate)} />
          <Col label="Production due" value={formatDate(job.productionDueDate)} />
          <Col label="RM delivery" value={formatDate(job.rmDeliveryDate)} />
        </dl>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 dark:bg-gray-900 dark:border-gray-800">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">RM details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>RM supplier</label>
            <input className={inputCls} value={rmSupplier} onChange={(e) => setRmSupplier(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Paper type</label>
            <input className={inputCls} value={paperType} onChange={(e) => setPaperType(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>GSM</label>
            <input type="number" className={inputCls} value={gsm} onChange={(e) => setGsm(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>RM size (mm)</label>
            <input type="number" className={inputCls} value={rmSizeMm} onChange={(e) => setRmSizeMm(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>RM qty (sheets)</label>
            <input type="number" className={inputCls} value={rmQtySheets} onChange={(e) => setRmQtySheets(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>RM qty (kgs)</label>
            <input type="number" step="0.01" className={inputCls} value={rmQtyKgs} onChange={(e) => setRmQtyKgs(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>RM delivery date</label>
            <input type="date" className={inputCls} value={rmDeliveryDate ? rmDeliveryDate.slice(0, 10) : ""} onChange={(e) => setRmDeliveryDate(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Printing due date</label>
            <input type="date" className={inputCls} value={printingDueDate ? printingDueDate.slice(0, 10) : ""} onChange={(e) => setPrintingDueDate(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Production due date</label>
            <input type="date" className={inputCls} value={productionDueDate ? productionDueDate.slice(0, 10) : ""} onChange={(e) => setProductionDueDate(e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3 dark:text-gray-500">These save along with the status update below.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 dark:bg-gray-900 dark:border-gray-800">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Update status</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Stage</label>
            <select className={inputCls} value={stage} onChange={(e) => setStage(e.target.value)}>
              {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Expected dispatch date</label>
            <input
              type="date"
              className={inputCls}
              value={expectedDispatchDate ? expectedDispatchDate.slice(0, 10) : ""}
              onChange={(e) => setExpectedDispatchDate(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Estimated delivery date (shown to customer)</label>
            <input
              type="date"
              className={inputCls}
              value={estimatedDeliveryDate ? estimatedDeliveryDate.slice(0, 10) : ""}
              onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Internal status (not shown to customer)</label>
            <input
              className={inputCls}
              placeholder="e.g. Forming plates pending, Colour approval awaited"
              value={internalStatus}
              onChange={(e) => setInternalStatus(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Action points (internal)</label>
            <textarea
              rows={3}
              className={inputCls}
              placeholder="Open tasks, follow-ups…"
              value={actionPoints}
              onChange={(e) => setActionPoints(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Note to log with this update (visible in customer timeline)</label>
            <input
              className={inputCls}
              placeholder="e.g. Moved to printing, production starts Monday"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={save}
            disabled={busy}
            className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save"}
          </button>
          {savedAt && <span className="text-xs text-green-600 dark:text-green-400">Saved {formatDateTime(savedAt.toISOString())}</span>}
          {err && <span className="text-xs text-red-500">{err}</span>}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 dark:bg-gray-900 dark:border-gray-800">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Timeline</h2>
        {updates.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">No updates yet.</p>}
        <ol className="space-y-3">
          {updates.map((u) => (
            <li key={u.id} className="flex items-start gap-3">
              <div className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm">
                  <StageBadge stage={u.stage} />
                  <span className="text-xs text-gray-500 dark:text-gray-400">{formatDateTime(u.createdAt)}</span>
                  {u.updatedByName && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">by {u.updatedByName}</span>
                  )}
                </div>
                {u.note && <p className="text-sm text-gray-700 mt-1 dark:text-gray-300">{u.note}</p>}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function Col({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="text-sm text-gray-900 dark:text-white">{value}</dd>
    </div>
  );
}
