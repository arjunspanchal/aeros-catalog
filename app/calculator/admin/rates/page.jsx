import { getSession } from "@/lib/calc/session";
import { redirect } from "next/navigation";
import { NavBar } from "@/app/calculator/_components/NavBar";
import { Card, Row, SectionHeader } from "@/app/calculator/_components/ui";
import {
  JODHANI_RATES, OM_SHIVAAY_RATES,
  JODHANI_DISCOUNT, WET_STRENGTH_EXTRA,
  GLUE_GSM, GLUE_RATE_PER_KG,
  CASE_PACKING_RATE_PER_BOX,
  CONVERSION_RATE,
  PLATE_COST_PER_COLOUR, SETUP_COST_PER_ORDER,
  PRINTING_RATES,
  HANDLE_DEFAULT_COST, HANDLE_WEIGHT_KG,
} from "@/lib/calc/calculator";

export default function AdminRatesPage() {
  const session = getSession();
  if (!session) redirect("/calculator/login");
  if (session.role !== "admin") redirect("/calculator/client");

  // Jodhani rates are baseline; effective = base − discount + default transport (₹5).
  const defaultTransport = 5;
  const jodhaniEffective = (base) => Math.round((base - JODHANI_DISCOUNT + defaultTransport) * 100) / 100;
  const jodhaniGSMs = ["82", "90", "100", "110", "120", "130", "140"];
  const jodhaniBFs = [24, 26, 28];

  // Fallback rates used by lookupPaperRate when no specific mill table matches.
  const fallbackRates = [
    { type: "Brown Kraft (no Jodhani/Om Shivaay match)", rate: 55 },
    { type: "Bleach Kraft White", rate: 130 },
    { type: "OGR", rate: 125 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar role="admin" />
      <div className="max-w-5xl mx-auto px-4 pb-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Mill Rates & Calculator Constants</h1>
        <p className="text-sm text-gray-500 mb-6">
          Read-only reference. These are the numbers the calculator is using right now.
          To change any of them, edit <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">lib/calc/calculator.js</code> and redeploy.
        </p>

        <div className="space-y-6">
          <Card title="Jodhani — Brown Kraft (effective ₹/kg)">
            <p className="text-xs text-gray-500 mb-3">
              Effective = base rate − ₹{JODHANI_DISCOUNT} discount + ₹{defaultTransport} default transport. Wet strength adds another ₹{WET_STRENGTH_EXTRA}/kg.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                    <th className="text-left pb-2 font-medium">GSM</th>
                    {jodhaniBFs.map((bf) => (
                      <th key={bf} className="text-right pb-2 font-medium">{bf} BF</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {jodhaniGSMs.map((gsm) => (
                    <tr key={gsm} className="border-b border-gray-50">
                      <td className="py-2 font-medium text-gray-700">{gsm}</td>
                      {jodhaniBFs.map((bf) => {
                        const base = JODHANI_RATES[gsm]?.[bf];
                        if (!base) return <td key={bf} className="py-2 text-right text-gray-300">—</td>;
                        return (
                          <td key={bf} className="py-2 text-right">
                            <span className="font-medium text-gray-900">₹{jodhaniEffective(base).toFixed(2)}</span>
                            <span className="block text-xs text-gray-400">base ₹{base}</span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Om Shivaay — Brown Kraft (₹/kg)">
            <p className="text-xs text-gray-500 mb-3">No discount or transport applied — flat rate.</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                  <th className="text-left pb-2 font-medium">GSM</th>
                  <th className="text-right pb-2 font-medium">28 BF</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(OM_SHIVAAY_RATES).map(([gsm, bfs]) => (
                  <tr key={gsm} className="border-b border-gray-50">
                    <td className="py-2 font-medium text-gray-700">{gsm}</td>
                    <td className="py-2 text-right font-medium text-gray-900">₹{bfs[28]?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card title="Fallback rates (for mills not in the main tables)">
            <p className="text-xs text-gray-500 mb-3">
              Used by the client calculator when no Jodhani/Om Shivaay match applies. Admin can override manually on the calculator form.
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                  <th className="text-left pb-2 font-medium">Paper type</th>
                  <th className="text-right pb-2 font-medium">Rate (₹/kg)</th>
                </tr>
              </thead>
              <tbody>
                {fallbackRates.map((row) => (
                  <tr key={row.type} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700">{row.type}</td>
                    <td className="py-2 text-right font-medium text-gray-900">₹{row.rate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card title="Fixed costs">
            <table className="w-full">
              <tbody>
                <SectionHeader label="Per-bag costs (material)" />
                <Row label="Glue" value={`${GLUE_GSM} GSM @ ₹${GLUE_RATE_PER_KG}/kg`} />
                <Row label="Case packing" value={`₹${CASE_PACKING_RATE_PER_BOX} per case`} sub="divided by case pack to get ₹/bag" />
                <Row label="Rope Handle cost" value={`₹${HANDLE_DEFAULT_COST.rope_handle}/bag default`} />
                <Row label="Flat Handle cost" value={`₹${HANDLE_DEFAULT_COST.flat_handle}/bag default`} />
                <Row label="Rope Handle weight" value={`${(HANDLE_WEIGHT_KG.rope_handle * 1000).toFixed(0)} g`} />
                <Row label="Flat Handle weight" value={`${(HANDLE_WEIGHT_KG.flat_handle * 1000).toFixed(0)} g`} />

                <SectionHeader label="Conversion labour (₹/kg of paper)" />
                <Row label="SOS" value={`₹${CONVERSION_RATE.sos}/kg`} />
                <Row label="Rope Handle" value={`₹${CONVERSION_RATE.rope_handle}/kg`} />
                <Row label="Flat Handle" value={`₹${CONVERSION_RATE.flat_handle}/kg`} />
                <Row label="V-Bottom" value={`₹${CONVERSION_RATE.v_bottom_gusset}/kg`} />

                <SectionHeader label="One-time costs (amortised across order qty)" />
                <Row label="Setup cost per run" value={`₹${SETUP_COST_PER_ORDER.toLocaleString()}`} sub="machine setup + setup wastage + QC" />
                <Row label="Plate cost per colour" value={`₹${PLATE_COST_PER_COLOUR.toLocaleString()}`} sub="printed bags only" />

                <SectionHeader label="Printing rates (₹/kg of paper)" />
                <Row label="10% coverage" value={`₹${PRINTING_RATES[10]}/kg`} />
                <Row label="30% coverage" value={`₹${PRINTING_RATES[30]}/kg`} />
                <Row label="100% coverage" value={`₹${PRINTING_RATES[100]}/kg`} />
              </tbody>
            </table>
          </Card>

          <Card title="Default wastage %">
            <p className="text-xs text-gray-500 mb-3">Applied to paper cost when admin doesn&apos;t override.</p>
            <table className="w-full">
              <tbody>
                <Row label="SOS" value="10%" />
                <Row label="Rope Handle / Flat Handle" value="7%" />
                <Row label="V-Bottom" value="5%" />
              </tbody>
            </table>
          </Card>
        </div>
      </div>
    </div>
  );
}
