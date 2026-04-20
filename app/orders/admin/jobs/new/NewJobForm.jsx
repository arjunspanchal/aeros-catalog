"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { inputCls, labelCls } from "@/app/orders/_components/ui";
import { CATEGORIES, STAGES } from "@/lib/orders/constants";

function defaultJNumber() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yy}${mm}`;
}

const NEW_CLIENT = "__new";
const PRINTING_TYPES = ["", "Flexo", "Offset", "NA"];

function Section({ title, children }) {
  return (
    <div className="border-t border-gray-100 dark:border-gray-800 pt-5 first:border-t-0 first:pt-0">
      <h3 className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3 dark:text-gray-400">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

export default function NewJobForm({ clients: initialClients, accountManagers, products = [] }) {
  const router = useRouter();
  const [clients, setClients] = useState(initialClients);
  const [form, setForm] = useState({
    jNumber: `${defaultJNumber()}000`,
    clientId: "",
    newClientName: "",
    brand: "",
    customerManagerId: "",
    productId: "",
    category: "Paper Bag",
    item: "",
    itemSize: "",
    city: "",
    qty: "",
    orderDate: new Date().toISOString().slice(0, 10),
    expectedDispatchDate: "",
    estimatedDeliveryDate: "",
    stage: STAGES[0],
    poNumber: "",
    // RM
    rmType: "",
    rmSupplier: "",
    paperType: "",
    gsm: "",
    rmSizeMm: "",
    rmQtySheets: "",
    rmQtyKgs: "",
    rmDeliveryDate: "",
    // Printing / production
    printingType: "",
    printingVendor: "",
    printingDueDate: "",
    productionDueDate: "",
    notes: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [productQuery, setProductQuery] = useState("");

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  const isNewClient = form.clientId === NEW_CLIENT;

  // Filter products by typed text — lets user narrow a long list.
  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return products.slice(0, 200);
    return products
      .filter((p) => `${p.productName} ${p.sku} ${p.category} ${p.sizeVolume}`.toLowerCase().includes(q))
      .slice(0, 200);
  }, [products, productQuery]);

  function onPickProduct(id) {
    const p = products.find((x) => x.id === id);
    if (!p) { set("productId", ""); return; }
    setForm((f) => ({
      ...f,
      productId: id,
      item: p.productName,
      itemSize: p.sizeVolume || f.itemSize,
      category: CATEGORIES.includes(p.category) ? p.category : f.category,
      gsm: p.gsm != null ? String(p.gsm) : f.gsm,
      paperType: p.material || f.paperType,
    }));
  }

  async function submit(e) {
    e.preventDefault();
    setErr(""); setBusy(true);

    let clientId = form.clientId;
    if (isNewClient) {
      const trimmed = form.newClientName.trim();
      if (!trimmed) { setErr("Enter a name for the new client"); setBusy(false); return; }
      const cRes = await fetch("/api/orders/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!cRes.ok) { setErr(`Couldn't create client: ${(await cRes.json()).error || "Failed"}`); setBusy(false); return; }
      const cData = await cRes.json();
      clientId = cData.client.id;
      setClients((prev) => [...prev, cData.client].sort((a, b) => a.name.localeCompare(b.name)));
    }

    const body = {
      ...form,
      clientId,
      qty: form.qty ? Number(form.qty) : undefined,
      gsm: form.gsm ? Number(form.gsm) : undefined,
      rmSizeMm: form.rmSizeMm ? Number(form.rmSizeMm) : undefined,
      rmQtySheets: form.rmQtySheets ? Number(form.rmQtySheets) : undefined,
      rmQtyKgs: form.rmQtyKgs ? Number(form.rmQtyKgs) : undefined,
      customerManagerId: form.customerManagerId || undefined,
      orderDate: form.orderDate || undefined,
      expectedDispatchDate: form.expectedDispatchDate || undefined,
      estimatedDeliveryDate: form.estimatedDeliveryDate || undefined,
      rmDeliveryDate: form.rmDeliveryDate || undefined,
      printingDueDate: form.printingDueDate || undefined,
      productionDueDate: form.productionDueDate || undefined,
    };
    delete body.newClientName;
    delete body.productId;

    const res = await fetch("/api/orders/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) { setErr((await res.json()).error || "Failed"); return; }
    const data = await res.json();
    router.push(`/orders/admin/jobs/${data.job.id}`);
  }

  return (
    <form onSubmit={submit} className="mt-6 bg-white border border-gray-200 rounded-xl p-5 space-y-5 dark:bg-gray-900 dark:border-gray-800">
      <Section title="Basics">
        <div>
          <label className={labelCls}>J#</label>
          <input className={inputCls} value={form.jNumber} onChange={(e) => set("jNumber", e.target.value)} required />
        </div>
        <div>
          <label className={labelCls}>PO number (optional)</label>
          <input className={inputCls} value={form.poNumber} onChange={(e) => set("poNumber", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Client</label>
          <select className={inputCls} value={form.clientId} onChange={(e) => set("clientId", e.target.value)} required>
            <option value="">Select client…</option>
            <option value={NEW_CLIENT}>+ Create new client</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {isNewClient && (
            <input
              className={`${inputCls} mt-2`}
              placeholder="New client name, e.g. Brewbay"
              value={form.newClientName}
              onChange={(e) => set("newClientName", e.target.value)}
              required
              autoFocus
            />
          )}
        </div>
        <div>
          <label className={labelCls}>Brand</label>
          <input className={inputCls} value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="e.g. aB Coffee" />
        </div>
        <div>
          <label className={labelCls}>Account manager</label>
          <select className={inputCls} value={form.customerManagerId} onChange={(e) => set("customerManagerId", e.target.value)}>
            <option value="">—</option>
            {accountManagers.map((u) => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Order date</label>
          <input type="date" className={inputCls} value={form.orderDate} onChange={(e) => set("orderDate", e.target.value)} />
        </div>
      </Section>

      <Section title="Item">
        <div className="sm:col-span-2">
          <label className={labelCls}>Pick from Products Master (auto-fills item, size, category, GSM, material)</label>
          <input
            className={`${inputCls} mb-2`}
            placeholder={`Search ${products.length} products by name / SKU / size…`}
            value={productQuery}
            onChange={(e) => setProductQuery(e.target.value)}
          />
          <select className={inputCls} value={form.productId} onChange={(e) => onPickProduct(e.target.value)}>
            <option value="">— None (enter manually below) —</option>
            {filteredProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.productName}{p.sku ? ` (${p.sku})` : ""}{p.sizeVolume ? ` · ${p.sizeVolume}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Category</label>
          <select className={inputCls} value={form.category} onChange={(e) => set("category", e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Item</label>
          <input className={inputCls} value={form.item} onChange={(e) => set("item", e.target.value)} placeholder="e.g. 250 ml DW Paper Cup" required />
        </div>
        <div>
          <label className={labelCls}>Item size</label>
          <input className={inputCls} value={form.itemSize} onChange={(e) => set("itemSize", e.target.value)} placeholder="e.g. 80 x 56 x 93 mm or 250 mL" />
        </div>
        <div>
          <label className={labelCls}>City (destination)</label>
          <input className={inputCls} value={form.city} onChange={(e) => set("city", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Quantity</label>
          <input type="number" className={inputCls} value={form.qty} onChange={(e) => set("qty", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Expected dispatch</label>
          <input type="date" className={inputCls} value={form.expectedDispatchDate} onChange={(e) => set("expectedDispatchDate", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Estimated delivery (customer-facing ETA)</label>
          <input type="date" className={inputCls} value={form.estimatedDeliveryDate} onChange={(e) => set("estimatedDeliveryDate", e.target.value)} />
        </div>
      </Section>

      <Section title="Raw material">
        <div>
          <label className={labelCls}>RM type</label>
          <input className={inputCls} value={form.rmType} onChange={(e) => set("rmType", e.target.value)} placeholder="Rolls / Sheets" />
        </div>
        <div>
          <label className={labelCls}>RM supplier</label>
          <input className={inputCls} value={form.rmSupplier} onChange={(e) => set("rmSupplier", e.target.value)} placeholder="e.g. BILT, Ajit Paper" />
        </div>
        <div>
          <label className={labelCls}>Paper type</label>
          <input className={inputCls} value={form.paperType} onChange={(e) => set("paperType", e.target.value)} placeholder="e.g. Bleach Kraft" />
        </div>
        <div>
          <label className={labelCls}>GSM</label>
          <input type="number" className={inputCls} value={form.gsm} onChange={(e) => set("gsm", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>RM size (mm)</label>
          <input type="number" className={inputCls} value={form.rmSizeMm} onChange={(e) => set("rmSizeMm", e.target.value)} placeholder="e.g. 890" />
        </div>
        <div>
          <label className={labelCls}>RM qty (sheets)</label>
          <input type="number" className={inputCls} value={form.rmQtySheets} onChange={(e) => set("rmQtySheets", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>RM qty (kgs)</label>
          <input type="number" step="0.01" className={inputCls} value={form.rmQtyKgs} onChange={(e) => set("rmQtyKgs", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>RM delivery date</label>
          <input type="date" className={inputCls} value={form.rmDeliveryDate} onChange={(e) => set("rmDeliveryDate", e.target.value)} />
        </div>
      </Section>

      <Section title="Printing & production">
        <div>
          <label className={labelCls}>Printing type</label>
          <select className={inputCls} value={form.printingType} onChange={(e) => set("printingType", e.target.value)}>
            {PRINTING_TYPES.map((t) => <option key={t} value={t}>{t || "—"}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Printing vendor</label>
          <input className={inputCls} value={form.printingVendor} onChange={(e) => set("printingVendor", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Printing due date</label>
          <input type="date" className={inputCls} value={form.printingDueDate} onChange={(e) => set("printingDueDate", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Production due date</label>
          <input type="date" className={inputCls} value={form.productionDueDate} onChange={(e) => set("productionDueDate", e.target.value)} />
        </div>
      </Section>

      <Section title="Workflow">
        <div>
          <label className={labelCls}>Starting stage</label>
          <select className={inputCls} value={form.stage} onChange={(e) => set("stage", e.target.value)}>
            {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Notes (visible to customer)</label>
          <textarea rows={2} className={inputCls} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>
      </Section>

      <div className="flex items-center gap-3 pt-2">
        <button disabled={busy} className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60">
          {busy ? "Creating…" : "Create job"}
        </button>
        {err && <span className="text-xs text-red-500">{err}</span>}
      </div>
    </form>
  );
}
