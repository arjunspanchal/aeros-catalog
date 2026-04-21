"use client";
import { useMemo, useState } from "react";
import { inputCls, labelCls } from "@/app/factoryos/_components/ui";
import { RUN_STATUSES } from "@/lib/factoryos/constants";

const statusLabel = Object.fromEntries(RUN_STATUSES.map((s) => [s.value, s.label]));

export default function RunDetail({ initialRun, machine, job, initialConsumption, inventory }) {
  const [run, setRun] = useState(initialRun);
  const [consumption, setConsumption] = useState(initialConsumption);
  // Mutable local copy of stock levels so the UI reflects decrements without a page reload.
  const [stockMap, setStockMap] = useState(() => Object.fromEntries(inventory.map((r) => [r.id, r.qtyKgs || 0])));

  const [consForm, setConsForm] = useState({ stockLineId: "", qtyKgs: "", notes: "" });
  const [consBusy, setConsBusy] = useState(false);
  const [consErr, setConsErr] = useState("");

  const [outputForm, setOutputForm] = useState({
    outputPcs: run.outputPcs ?? "",
    wastePcs: run.wastePcs ?? "",
  });
  const [runPatchBusy, setRunPatchBusy] = useState(false);
  const [runPatchErr, setRunPatchErr] = useState("");

  // Only show stock rows with some kgs — but include the one currently selected even if zero
  // so operators can finish entering a value they started.
  const selectableStock = useMemo(() => {
    return inventory.filter((r) => (stockMap[r.id] || 0) > 0 || r.id === consForm.stockLineId);
  }, [inventory, stockMap, consForm.stockLineId]);

  const totalKgsConsumed = consumption.reduce((sum, c) => sum + (c.qtyKgs || 0), 0);
  const yieldPerKg = totalKgsConsumed > 0 && run.outputPcs ? run.outputPcs / totalKgsConsumed : null;

  async function addConsumption(e) {
    e.preventDefault();
    setConsErr("");
    if (!consForm.stockLineId) {
      setConsErr("Pick a stock line");
      return;
    }
    if (!consForm.qtyKgs || Number(consForm.qtyKgs) <= 0) {
      setConsErr("Enter kgs consumed");
      return;
    }
    setConsBusy(true);
    const res = await fetch(`/api/factoryos/runs/${run.id}/consumption`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stockLineId: consForm.stockLineId,
        qtyKgs: Number(consForm.qtyKgs),
        notes: consForm.notes,
      }),
    });
    setConsBusy(false);
    if (!res.ok) {
      setConsErr((await res.json()).error || "Failed");
      return;
    }
    const { consumption: newRow, newStockKgs } = await res.json();
    setConsumption((prev) => [newRow, ...prev]);
    setStockMap((prev) => ({ ...prev, [consForm.stockLineId]: newStockKgs }));
    setConsForm({ stockLineId: "", qtyKgs: "", notes: "" });
  }

  async function patchRun(patch) {
    setRunPatchErr("");
    setRunPatchBusy(true);
    const res = await fetch(`/api/factoryos/runs/${run.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setRunPatchBusy(false);
    if (!res.ok) {
      setRunPatchErr((await res.json()).error || "Failed");
      return;
    }
    const { run: updated } = await res.json();
    setRun(updated);
    return updated;
  }

  async function saveOutput(e) {
    e.preventDefault();
    const outputPcs = outputForm.outputPcs === "" ? null : Number(outputForm.outputPcs);
    const wastePcs = outputForm.wastePcs === "" ? null : Number(outputForm.wastePcs);
    await patchRun({ outputPcs, wastePcs });
  }

  async function finishRun() {
    if (!confirm("Mark this run as Done? You can still edit consumption and output after.")) return;
    await patchRun({ status: "done", endTime: new Date().toISOString() });
  }

  async function cancelRun() {
    if (!confirm("Cancel this run? Consumption already recorded will NOT be refunded to inventory.")) return;
    await patchRun({ status: "cancelled", endTime: new Date().toISOString() });
  }

  const stockById = Object.fromEntries(inventory.map((r) => [r.id, r]));
  const canLogMore = run.status === "running" || run.status === "planned";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 mt-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-mono">{run.runId}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {machine?.name || "Unknown machine"}
            {job ? ` · Job ${job.jNumber || ""} (${job.brand || job.item || ""})` : " · Stock run"}
          </p>
        </div>
        <StatusPill status={run.status} />
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        <Stat label="Consumed" value={`${totalKgsConsumed.toFixed(2)} kg`} />
        <Stat label="Output" value={run.outputPcs != null ? `${run.outputPcs.toLocaleString()} pcs` : "—"} />
        <Stat label="Yield" value={yieldPerKg ? `${yieldPerKg.toFixed(1)} pcs/kg` : "—"} />
      </div>

      {canLogMore && (
        <div className="mt-6 bg-white border border-gray-200 rounded-xl p-4 sm:p-5 dark:bg-gray-900 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Log RM consumed</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Stock decrements immediately. Roll count on the inventory row is unchanged — reconcile manually when a roll is fully finished.
          </p>
          <form onSubmit={addConsumption} className="mt-3 grid grid-cols-1 md:grid-cols-6 gap-2 md:items-end">
            <div className="md:col-span-3">
              <label className={labelCls}>Stock line</label>
              <select
                className={`${inputCls} text-base`}
                value={consForm.stockLineId}
                onChange={(e) => setConsForm({ ...consForm, stockLineId: e.target.value })}
              >
                <option value="">Pick paper…</option>
                {selectableStock.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name || r.masterRmName || r.paperType || "RM"} — {(stockMap[r.id] || 0).toFixed(2)} kg on hand
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-1">
              <label className={labelCls}>Kgs used</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className={`${inputCls} text-base`}
                value={consForm.qtyKgs}
                onChange={(e) => setConsForm({ ...consForm, qtyKgs: e.target.value })}
                placeholder="e.g. 45.5"
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Note</label>
              <input
                className={`${inputCls} text-base`}
                value={consForm.notes}
                onChange={(e) => setConsForm({ ...consForm, notes: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div className="md:col-span-6">
              <button
                disabled={consBusy}
                className="w-full md:w-auto bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60"
              >
                {consBusy ? "Recording…" : "+ Add consumption"}
              </button>
              {consErr && <span className="ml-3 text-xs text-red-600 dark:text-red-400 font-medium">⚠️ {consErr}</span>}
            </div>
          </form>
        </div>
      )}

      <div className="mt-4 bg-white border border-gray-200 rounded-xl dark:bg-gray-900 dark:border-gray-800" style={{ overflow: "hidden" }}>
        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Consumption log</h2>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {consumption.length} {consumption.length === 1 ? "entry" : "entries"}
          </span>
        </div>
        {consumption.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">No consumption yet.</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {consumption.map((c) => {
              const s = stockById[c.stockLineId];
              return (
                <div key={c.id} className="px-4 py-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-gray-900 dark:text-white">{s?.name || s?.masterRmName || "Unknown RM"}</p>
                      {c.notes && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{c.notes}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-gray-900 dark:text-white font-medium">{c.qtyKgs.toFixed(2)} kg</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{formatLocal(c.createdAt)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 bg-white border border-gray-200 rounded-xl p-4 sm:p-5 dark:bg-gray-900 dark:border-gray-800">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Output</h2>
        <form onSubmit={saveOutput} className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-2 md:items-end">
          <div>
            <label className={labelCls}>Output (pcs)</label>
            <input
              type="number"
              min="0"
              step="1"
              className={`${inputCls} text-base`}
              value={outputForm.outputPcs}
              onChange={(e) => setOutputForm({ ...outputForm, outputPcs: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>Waste (pcs)</label>
            <input
              type="number"
              min="0"
              step="1"
              className={`${inputCls} text-base`}
              value={outputForm.wastePcs}
              onChange={(e) => setOutputForm({ ...outputForm, wastePcs: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <button
              disabled={runPatchBusy}
              className="w-full md:w-auto bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-60"
            >
              Save output
            </button>
          </div>
        </form>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {run.status !== "done" && run.status !== "cancelled" && (
          <button
            onClick={finishRun}
            disabled={runPatchBusy}
            className="text-sm bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-60"
          >
            ✓ Mark as Done
          </button>
        )}
        {run.status !== "cancelled" && run.status !== "done" && (
          <button
            onClick={cancelRun}
            disabled={runPatchBusy}
            className="text-sm bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg font-medium disabled:opacity-60 dark:bg-red-900/30 dark:text-red-300"
          >
            Cancel run
          </button>
        )}
      </div>
      {runPatchErr && (
        <div className="mt-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2 text-sm text-red-700 dark:text-red-300">
          ⚠️ {runPatchErr}
        </div>
      )}

      {run.notes && (
        <div className="mt-4 bg-white border border-gray-200 rounded-xl p-4 dark:bg-gray-900 dark:border-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400">Notes</p>
          <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap mt-1">{run.notes}</p>
        </div>
      )}
    </>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 dark:bg-gray-900 dark:border-gray-800">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">{value}</p>
    </div>
  );
}

function StatusPill({ status }) {
  const label = statusLabel[status] || status;
  const cls =
    status === "running"
      ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
      : status === "done"
      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
      : status === "cancelled"
      ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
      : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200";
  return <span className={`inline-block px-3 py-1 rounded text-sm font-medium whitespace-nowrap ${cls}`}>{label}</span>;
}

function formatLocal(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString([], { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}
