// Server-side rate calculation. For clients, the profit % is taken from their session
// (set at login from the Clients table) and never from the request body. This keeps the
// margin hidden from the front-end.
import { calculate, computeRateCurve, optimizationTips, lookupPaperRate } from "@/lib/calc/calculator";
import { getSession } from "@/lib/calc/session";
import { airtableList, escapeFormula, TABLES } from "@/lib/calc/airtable";

async function currentClientMargin(email, fallback) {
  try {
    const [rec] = await airtableList(TABLES.clients(), {
      filterByFormula: `LOWER({Email})='${escapeFormula(email)}'`,
      maxRecords: 1,
    });
    const v = rec?.fields?.["Margin %"];
    return v !== undefined && v !== null ? Number(v) : fallback;
  } catch {
    return fallback;
  }
}

export const runtime = "nodejs";

export async function POST(req) {
  const session = getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const body = await req.json();
  const isClient = session.role === "client";

  // Clients never supply paper rate or wastage — both are derived server-side.
  const paperRate = isClient
    ? lookupPaperRate({ paperType: body.paperType, mill: body.mill, gsm: Number(body.gsm), bf: body.bf })
    : Number(body.paperRate) || 0;

  const inputs = {
    bagType: body.bagType,
    width: Number(body.width) || 0,
    gusset: Number(body.gusset) || 0,
    height: Number(body.height) || 0,
    gsm: Number(body.gsm) || 0,
    paperRate,
    casePack: Number(body.casePack) || 1,
    // Admin may override; otherwise calculate.js applies rope=0.85 / flat=1.00 defaults.
    handleCost: body.handleCost !== undefined && body.handleCost !== "" ? Number(body.handleCost) : undefined,
    customWastage: isClient ? "" : (body.customWastage ?? ""),
    profitPercent: isClient
      ? await currentClientMargin(session.email, Number(session.marginPct ?? process.env.DEFAULT_CLIENT_MARGIN ?? 15))
      : Number(body.profitPercent) || 10,
    printing: !!body.printing,
    colours: Number(body.colours) || 1,
    coverage: Number(body.coverage) || 30,
  };

  if (inputs.width <= 0 || inputs.height <= 0 || inputs.gsm <= 0 || inputs.paperRate <= 0) {
    return Response.json({ error: "Width, height, and GSM are required." }, { status: 400 });
  }

  const result = calculate(inputs);
  const curve = computeRateCurve(inputs);

  const payload = { result, curve, role: session.role };
  if (session.role === "admin") {
    payload.tips = optimizationTips(inputs, result);
  } else {
    // Strip internal cost breakdown for clients. They see final rates, weight, + box only.
    payload.result = {
      sellingPrice: result.sellingPrice,
      wkg: result.wkg,
      handleWeight: result.handleWeight,
      totalWeight: result.totalWeight,
      plateCost: result.plateCost,
      box: result.box,
    };
  }
  return Response.json(payload);
}
