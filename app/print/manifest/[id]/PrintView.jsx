"use client";

import { useEffect } from "react";

function fmtDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  return isNaN(dt.getTime())
    ? d
    : dt.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fmt(n, dp = 2) {
  if (n == null) return "—";
  return Number(n).toLocaleString("en-IN", { minimumFractionDigits: dp, maximumFractionDigits: dp });
}
function fmtInt(n) {
  if (n == null) return "—";
  return Number(n).toLocaleString("en-IN");
}

function th(align = "left") {
  return {
    border: "1px solid #999",
    padding: "5px 7px",
    textAlign: align,
    fontWeight: 600,
    fontSize: "10.5px",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
  };
}
function td(align = "left") {
  return { border: "1px solid #ccc", padding: "5px 7px", textAlign: align, fontSize: "11px" };
}

function Pair({ label, value }) {
  return (
    <div style={{ marginBottom: "4px" }}>
      <span style={{ color: "#666", fontSize: "10.5px", textTransform: "uppercase", letterSpacing: "0.03em" }}>
        {label}:{" "}
      </span>
      <span style={{ fontSize: "11.5px", fontWeight: 500 }}>{value || "—"}</span>
    </div>
  );
}

export default function PrintView({ manifest: m, groups = [], invoices = [], totals, suggestion = null }) {
  useEffect(() => {
    // Auto-open the print dialog so "Save as PDF" is one keystroke away.
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, []);


  return (
    <div className="bg-white text-black mx-auto" style={{ maxWidth: "860px", padding: "32px" }}>
      <style>{`
        @page { size: A4; margin: 14mm; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          tr { page-break-inside: avoid; }
        }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      `}</style>

      <div className="no-print mb-6 flex justify-end">
        <button onClick={() => window.print()} className="rounded-lg bg-black px-4 py-2 text-sm text-white">
          Print / Save PDF
        </button>
      </div>

      <header style={{ borderBottom: "2px solid #000", paddingBottom: "12px", marginBottom: "18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "0.05em", margin: 0 }}>Aeros</h1>
            <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#555" }}>
              Boson Machines OPC Pvt Ltd · Mumbai, India
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, letterSpacing: "0.04em" }}>DISPATCH MANIFEST</div>
            <div style={{ fontSize: "12px", marginTop: "4px" }}>
              <strong>{m.manifest_no}</strong>
            </div>
            <div style={{ fontSize: "11px", color: "#555" }}>{fmtDate(m.manifest_date)}</div>
          </div>
        </div>
      </header>

      {/* Lean header: this manifest describes a LOAD, not a billed freight
          movement — no single customer, no lane, no freight economics. */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0 24px",
          marginBottom: "18px",
        }}
      >
        <div>
          <Pair label="Vehicle" value={[m.vehicle_size, m.vehicle_number].filter(Boolean).join(" \u00b7 ")} />
          <Pair label="Reference" value={m.reference} />
        </div>
        <div>
          <Pair
            label={invoices.length === 1 ? "Invoice" : "Invoices"}
            value={invoices.length ? `${invoices.length} on this vehicle` : "\u2014"}
          />
          <Pair
            label="Consignees"
            value={
              [...new Set(invoices.map((i) => i.customer_name).filter(Boolean))].join(", ") || null
            }
          />
        </div>
      </section>

      {/* One section per invoice — the consignee reconciles their own boxes
          against their own invoice at the gate, which a single merged table
          can't support on a multi-drop vehicle. */}
      {groups.length === 0 ? (
        <p style={{ fontSize: "11px", color: "#777", marginBottom: "16px" }}>
          No box types on this manifest.
        </p>
      ) : (
        groups.map((g, gi) => (
          <section key={g.invoice?.id || `unassigned-${gi}`} style={{ marginBottom: "16px" }}>
            <div
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "baseline",
                borderBottom: "1px solid #999", paddingBottom: "3px", marginBottom: "6px",
              }}
            >
              <div style={{ fontSize: "12px", fontWeight: 700 }}>
                {g.invoice ? (
                  <>
                    {groups.length > 1 && `Drop ${g.invoice.seq} · `}
                    Invoice {g.invoice.invoice_no}
                    <span style={{ fontWeight: 400, color: "#555" }}>
                      {" — "}{g.invoice.customer_name}
                      {g.invoice.drop_city ? `, ${g.invoice.drop_city}` : ""}
                    </span>
                  </>
                ) : (
                  <span style={{ color: "#92400e" }}>Not assigned to an invoice</span>
                )}
              </div>
              <div style={{ fontSize: "10.5px", color: "#555" }}>
                {g.invoice?.eway_bill_no ? `E-way bill ${g.invoice.eway_bill_no}` : ""}
              </div>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f4f4f4" }}>
                  <th style={th()}>#</th>
                  <th style={th()}>SKU</th>
                  <th style={th()}>Item description</th>
                  <th style={th("right")}>Pcs / box</th>
                  <th style={th("right")}>Carton (mm)</th>
                  <th style={th("right")}>Boxes</th>
                  <th style={th("right")}>Kg / box</th>
                  <th style={th("right")}>Total kg</th>
                  <th style={th("right")}>CBM</th>
                </tr>
              </thead>
              <tbody>
                {g.lines.map((l, i) => (
                  <tr key={l.id}>
                    <td style={td()}>{i + 1}</td>
                    <td style={{ ...td(), fontFamily: "monospace", fontSize: "10.5px" }}>{l.sku || "—"}</td>
                    <td style={td()}>{l.description}</td>
                    <td style={td("right")}>{l.units_per_case != null ? fmtInt(l.units_per_case) : "—"}</td>
                    <td style={{ ...td("right"), whiteSpace: "nowrap" }}>{l.carton_dims || "—"}</td>
                    <td style={{ ...td("right"), fontWeight: 600 }}>{fmtInt(l.box_count)}</td>
                    <td style={td("right")}>{l.kg_per_box != null ? fmt(l.kg_per_box, 2) : "—"}</td>
                    <td style={td("right")}>{l.line_kg != null ? fmt(l.line_kg) : "—"}</td>
                    <td style={td("right")}>{l.line_cbm != null ? fmt(l.line_cbm, 3) : "—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: "#fafafa" }}>
                  <td style={{ ...td("right"), fontWeight: 600 }} colSpan={5}>
                    {g.invoice ? `Invoice ${g.invoice.invoice_no} subtotal` : "Unassigned subtotal"}
                  </td>
                  <td style={{ ...td("right"), fontWeight: 700 }}>{fmtInt(g.totals.boxes)}</td>
                  <td style={td()} />
                  <td style={{ ...td("right"), fontWeight: 700 }}>{fmt(g.totals.kg)}</td>
                  <td style={{ ...td("right"), fontWeight: 700 }}>{fmt(g.totals.cbm, 3)}</td>
                </tr>
              </tfoot>
            </table>
          </section>
        ))
      )}

      {/* The headline the driver, the transporter and the gate all read off. */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          border: "2px solid #000",
          marginBottom: "8px",
        }}
      >
        <div style={{ padding: "10px 14px", borderRight: "1px solid #999" }}>
          <div style={{ fontSize: "10.5px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#555" }}>
            {groups.length > 1 ? "Vehicle total \u2014 boxes" : "Total boxes"}
          </div>
          <div style={{ fontSize: "22px", fontWeight: 700, marginTop: "2px" }}>{fmtInt(totals.boxes)}</div>
        </div>
        <div style={{ padding: "10px 14px", borderRight: "1px solid #999" }}>
          <div style={{ fontSize: "10.5px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#555" }}>
            Total weight
          </div>
          <div style={{ fontSize: "22px", fontWeight: 700, marginTop: "2px" }}>{fmt(totals.kg)} kg</div>
        </div>
        <div style={{ padding: "10px 14px" }}>
          <div style={{ fontSize: "10.5px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#555" }}>
            Total volume
          </div>
          <div style={{ fontSize: "22px", fontWeight: 700, marginTop: "2px" }}>{fmt(totals.cbm, 3)} CBM</div>
        </div>
      </section>

      {/* An incomplete manifest must say so on the paper, not just on screen —
          otherwise the printed total silently understates the load. */}
      {(totals.missingKg > 0 || totals.missingCbm > 0) && (
        <p style={{ fontSize: "10.5px", color: "#92400e", margin: "0 0 12px" }}>
          Note: {totals.missingKg > 0 && `${totals.missingKg} line(s) without a per-box weight`}
          {totals.missingKg > 0 && totals.missingCbm > 0 && " and "}
          {totals.missingCbm > 0 && `${totals.missingCbm} line(s) without a carton size`} are excluded from the
          totals above.
        </p>
      )}

      {suggestion && (
        <p style={{ fontSize: "11px", color: "#333", margin: "0 0 6px" }}>
          {suggestion.overflow ? (
            <>
              This load exceeds one <strong>{suggestion.biggest.name}</strong> — plan for about{" "}
              <strong>{suggestion.trips} vehicles</strong>.
            </>
          ) : (
            <>
              Vehicle for this volume: <strong>{suggestion.vehicle.name}</strong> ({suggestion.vehicle.body},
              ~{suggestion.usableCbm} CBM usable) — indicative, confirm with the transporter.
            </>
          )}
        </p>
      )}

      {totals.pcs > 0 && (
        <p style={{ fontSize: "11px", color: "#333", margin: "0 0 16px" }}>
          Total pieces on this vehicle: <strong>{fmtInt(totals.pcs)}</strong>
        </p>
      )}

      {m.notes && (
        <section style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "10.5px", textTransform: "uppercase", letterSpacing: "0.03em", color: "#555" }}>
            Notes
          </div>
          <p style={{ fontSize: "11px", margin: "4px 0 0", whiteSpace: "pre-wrap" }}>{m.notes}</p>
        </section>
      )}

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "24px",
          marginTop: "42px",
          fontSize: "10.5px",
          color: "#555",
        }}
      >
        {["Prepared by (Warehouse)", "Driver signature", "Received by (Customer)"].map((label) => (
          <div key={label}>
            <div style={{ borderTop: "1px solid #999", paddingTop: "5px" }}>{label}</div>
          </div>
        ))}
      </section>

      <p style={{ marginTop: "24px", fontSize: "9.5px", color: "#888", textAlign: "center" }}>
        Weight and volume are computed from the carton specs recorded against each box type on this manifest.
      </p>
    </div>
  );
}
