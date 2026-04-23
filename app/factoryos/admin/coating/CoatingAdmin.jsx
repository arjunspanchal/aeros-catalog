"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { inputCls, labelCls } from "@/app/factoryos/_components/ui";

const COATERS = ["Jayant Printery", "Wikas"];
// Keep these labels identical to the master's `Mill Coating` enum in the Paper
// RM Database — one vocabulary across send-out, receive-back, and inventory tags.
const COATING_TYPES = ["PE 1-side", "PE 2-side"];

const DEFAULT_PE_RATES = { "PE 1-side": "13", "PE 2-side": "26" };

const STATUS_COLORS = {
  Sent: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
  Received: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200",
  Cancelled: "bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const TODAY = () => new Date().toISOString().slice(0, 10);

function stockLabel(rm) {
  if (!rm) return "—";
  const bits = [
    rm.name || rm.masterRmName || rm.paperType || "RM",
    rm.coating ? `[${rm.coating}]` : null,
  ].filter(Boolean);
  return bits.join(" ");
}

export default function CoatingAdmin({ initialJobs, sendableStock, inventoryById }) {
  const router = useRouter();
  const [jobs, setJobs] = useState(initialJobs);

  // Send-out form state.
  const [sendForm, setSendForm] = useState({
    sourceStockLineId: "",
    coater: COATERS[0],
    coatingType: "PE 1-side",
    qtySent: "",
    sentDate: TODAY(),
    notes: "",
  });
  const [sendBusy, setSendBusy] = useState(false);
  const [sendErr, setSendErr] = useState("");

  // Receive-back modal state. `null` = closed; otherwise holds the job being received.
  const [receiving, setReceiving] = useState(null);
  const [receiveForm, setReceiveForm] = useState({ qtyReturned: "", peRate: "", returnDate: TODAY(), invoiceNumber: "", notes: "" });
  const [receiveBusy, setReceiveBusy] = useState(false);
  const [receiveErr, setReceiveErr] = useState("");

  const sourceRow = useMemo(
    () => sendableStock.find((r) => r.id === sendForm.sourceStockLineId) || null,
    [sendableStock, sendForm.sourceStockLineId],
  );

  async function submitSend(e) {
    e.preventDefault();
    setSendErr("");
    if (!sendForm.sourceStockLineId) { setSendErr("Pick an uncoated stock line"); return; }
    if (!sendForm.qtySent || Number(sendForm.qtySent) <= 0) { setSendErr("Qty Sent must be positive"); return; }
    setSendBusy(true);
    const res = await fetch("/api/factoryos/coating", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...sendForm,
        qtySent: Number(sendForm.qtySent),
      }),
    });
    setSendBusy(false);
    if (!res.ok) { setSendErr((await res.json()).error || "Failed"); return; }
    const data = await res.json();
    setJobs((prev) => [data.job, ...prev]);
    setSendForm({
      sourceStockLineId: "",
      coater: COATERS[0],
      coatingType: "PE 1-side",
      qtySent: "",
      sentDate: TODAY(),
      notes: "",
    });
    // Source stock qty changed on the server; refresh the page so the dropdown reflects it.
    router.refresh();
  }

  function openReceive(job) {
    setReceiving(job);
    setReceiveErr("");
    setReceiveForm({
      qtyReturned: "",
      peRate: DEFAULT_PE_RATES[job.coatingType] || "",
      returnDate: TODAY(),
      invoiceNumber: "",
      notes: "",
    });
  }

  function closeReceive() { setReceiving(null); }

  async function submitReceive(e) {
    e.preventDefault();
    if (!receiving) return;
    setReceiveErr("");
    if (!receiveForm.qtyReturned || Number(receiveForm.qtyReturned) <= 0) {
      setReceiveErr("Qty Returned must be positive");
      return;
    }
    setReceiveBusy(true);
    const res = await fetch(`/api/factoryos/coating/${receiving.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "receive",
        qtyReturned: Number(receiveForm.qtyReturned),
        peRate: receiveForm.peRate !== "" ? Number(receiveForm.peRate) : undefined,
        returnDate: receiveForm.returnDate,
        invoiceNumber: receiveForm.invoiceNumber,
        notes: receiveForm.notes,
      }),
    });
    setReceiveBusy(false);
    if (!res.ok) { setReceiveErr((await res.json()).error || "Failed"); return; }
    const data = await res.json();
    setJobs((prev) => prev.map((j) => (j.id === receiving.id ? data.job : j)));
    closeReceive();
    router.refresh();
  }

  async function cancelJob(job) {
    const reason = window.prompt(`Cancel coating job ${job.jobId}? Enter a reason (optional):`, "");
    if (reason === null) return; // cancelled the prompt itself
    const res = await fetch(`/api/factoryos/coating/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel", reason }),
    });
    if (!res.ok) { alert(`Cancel failed: ${(await res.json()).error || "unknown"}`); return; }
    const data = await res.json();
    setJobs((prev) => prev.map((j) => (j.id === job.id ? data.job : j)));
    router.refresh();
  }

  const activeCount = jobs.filter((j) => j.status === "Sent").length;

  return (
    <div className="mt-6 space-y-6">
      {/* Send-out form */}
      <form onSubmit={submitSend} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 dark:bg-gray-900 dark:border-gray-800">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Send stock for PE coating</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Picks an uncoated lot and debits its Qty (kgs). When the coated stock returns, use the "Receive" button below.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-3">
            <label className={labelCls}>Uncoated stock line</label>
            <select
              className={inputCls}
              value={sendForm.sourceStockLineId}
              onChange={(e) => setSendForm({ ...sendForm, sourceStockLineId: e.target.value })}
              required
            >
              <option value="">— Select uncoated lot —</option>
              {sendableStock.map((rm) => (
                <option key={rm.id} value={rm.id}>
                  {stockLabel(rm)} · {rm.qtyKgs?.toLocaleString("en-IN") || 0} kgs available
                </option>
              ))}
            </select>
            {sendableStock.length === 0 && (
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">No uncoated stock with qty &gt; 0 in inventory.</p>
            )}
          </div>

          <div>
            <label className={labelCls}>Coater</label>
            <select className={inputCls} value={sendForm.coater} onChange={(e) => setSendForm({ ...sendForm, coater: e.target.value })}>
              {COATERS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Coating type</label>
            <select className={inputCls} value={sendForm.coatingType} onChange={(e) => setSendForm({ ...sendForm, coatingType: e.target.value })}>
              {COATING_TYPES.map((t) => <option key={t} value={t}>{t === "PE 1-side" ? "PE 1-side (sidewall, ~18g)" : "PE 2-side (bottom)"}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Qty sent (kgs)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className={inputCls}
              value={sendForm.qtySent}
              onChange={(e) => setSendForm({ ...sendForm, qtySent: e.target.value })}
              placeholder={sourceRow ? `max ${sourceRow.qtyKgs?.toFixed(2)}` : ""}
              required
            />
          </div>
          <div>
            <label className={labelCls}>Sent date</label>
            <input type="date" className={inputCls} value={sendForm.sentDate} onChange={(e) => setSendForm({ ...sendForm, sentDate: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Notes (optional)</label>
            <input className={inputCls} value={sendForm.notes} onChange={(e) => setSendForm({ ...sendForm, notes: e.target.value })} placeholder="e.g. vehicle number, LR#" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button disabled={sendBusy} className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60">
            {sendBusy ? "Sending…" : "Send for coating"}
          </button>
          {sendErr && <span className="text-xs text-red-500">{sendErr}</span>}
        </div>
      </form>

      {/* Job list */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden dark:bg-gray-900 dark:border-gray-800">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">All jobs</h2>
          <span className="text-xs text-gray-500 dark:text-gray-400">{activeCount} in transit · {jobs.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase dark:bg-gray-800/50 dark:text-gray-400">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Job</th>
                <th className="text-left px-4 py-2 font-medium">Coater / Type</th>
                <th className="text-left px-4 py-2 font-medium">Source</th>
                <th className="text-right px-4 py-2 font-medium">Sent (kgs)</th>
                <th className="text-right px-4 py-2 font-medium">Returned (kgs)</th>
                <th className="text-right px-4 py-2 font-medium">PE ₹/kg</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-right px-4 py-2 font-medium">&nbsp;</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {jobs.map((j) => {
                const source = j.sourceStockLineId ? inventoryById[j.sourceStockLineId] : null;
                const result = j.resultStockLineId ? inventoryById[j.resultStockLineId] : null;
                const cost = j.qtyReturned != null && j.peRate != null ? j.qtyReturned * j.peRate : null;
                return (
                  <tr key={j.id}>
                    <td className="px-4 py-2 font-mono text-xs text-gray-600 dark:text-gray-300">
                      <div>{j.jobId}</div>
                      {j.sentDate && <div className="text-gray-400 dark:text-gray-500">Sent: {j.sentDate}</div>}
                      {j.returnDate && <div className="text-gray-400 dark:text-gray-500">Back: {j.returnDate}</div>}
                    </td>
                    <td className="px-4 py-2">
                      <div className="text-gray-900 dark:text-white">{j.coater || "—"}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{j.coatingType || "—"}</div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="text-gray-900 dark:text-white">{stockLabel(source)}</div>
                      {result && <div className="text-xs text-gray-500 dark:text-gray-400">→ {stockLabel(result)}</div>}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-gray-900 dark:text-white">
                      {j.qtySent?.toLocaleString("en-IN", { maximumFractionDigits: 2 }) || "—"}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-gray-900 dark:text-white">
                      {j.qtyReturned != null ? j.qtyReturned.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-gray-900 dark:text-white">
                      {j.peRate != null ? `₹${j.peRate.toFixed(2)}` : "—"}
                      {cost != null && <div className="text-xs text-gray-500 dark:text-gray-400">₹{cost.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</div>}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${STATUS_COLORS[j.status] || ""}`}>
                        {j.status || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      {j.status === "Sent" && (
                        <>
                          <button onClick={() => openReceive(j)} className="text-xs text-blue-600 hover:underline dark:text-blue-400 mr-3">Receive</button>
                          <button onClick={() => cancelJob(j)} className="text-xs text-red-600 hover:underline dark:text-red-400">Cancel</button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
              {jobs.length === 0 && (
                <tr><td colSpan={8} className="text-center text-sm text-gray-500 py-8 dark:text-gray-400">No coating jobs yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receive modal */}
      {receiving && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <form onSubmit={submitReceive} className="bg-white rounded-xl p-5 w-full max-w-lg space-y-4 dark:bg-gray-900">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Receive coated stock</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono">{receiving.jobId}</p>
              </div>
              <button type="button" onClick={closeReceive} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
            </div>

            <div className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
              <div>Source: <span className="font-medium">{stockLabel(inventoryById[receiving.sourceStockLineId])}</span></div>
              <div>Sent: <span className="font-medium">{receiving.qtySent?.toFixed(2)} kgs</span> · {receiving.coatingType} at {receiving.coater}</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Qty returned (kgs)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={inputCls}
                  value={receiveForm.qtyReturned}
                  onChange={(e) => setReceiveForm({ ...receiveForm, qtyReturned: e.target.value })}
                  required
                  autoFocus
                />
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Post-coating weight (sent + PE added − yield loss).</p>
              </div>
              <div>
                <label className={labelCls}>PE rate (₹/kg)</label>
                <input
                  type="number"
                  step="0.01"
                  className={inputCls}
                  value={receiveForm.peRate}
                  onChange={(e) => setReceiveForm({ ...receiveForm, peRate: e.target.value })}
                  placeholder="13"
                />
              </div>
              <div>
                <label className={labelCls}>Return date</label>
                <input type="date" className={inputCls} value={receiveForm.returnDate} onChange={(e) => setReceiveForm({ ...receiveForm, returnDate: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Invoice # (optional)</label>
                <input className={inputCls} value={receiveForm.invoiceNumber} onChange={(e) => setReceiveForm({ ...receiveForm, invoiceNumber: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Notes (optional)</label>
                <input className={inputCls} value={receiveForm.notes} onChange={(e) => setReceiveForm({ ...receiveForm, notes: e.target.value })} />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              {receiveErr && <span className="text-xs text-red-500 mr-auto">{receiveErr}</span>}
              <button type="button" onClick={closeReceive} className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">
                Cancel
              </button>
              <button disabled={receiveBusy} className="bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-60">
                {receiveBusy ? "Saving…" : "Receive"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
