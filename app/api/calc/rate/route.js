// Server-side rate calculation. For clients, the profit % is taken from their session
// (set at login from the Clients table) and never from the request body. This keeps the
// margin hidden from the front-end.
import { calculate, computeRateCurve, optimizationTips, lookupPaperRate } from "@/lib/calc/calculator";
import { getSession } from "@/lib/calc/session";
import { currentClientPricing } from "@/lib/calc/user-directory";
import { fetchPaperRMTables, lookupRMPaperRate } from "@/lib/calc/rmRates";

function applyDiscount(curve, discountPct) {
  if (!discountPct) return curve;
  const factor = 1 - discountPct / 100;
  return curve.map((c) => ({
    ...c,
    ratePerBag: Math.round(c.ratePerBag * factor * 10000) / 10000,
    orderTotal: Math.round(c.ratePerBag * factor * c.qty * 100) / 100,
    costPerCase: Math.round(c.ratePerBag * factor * (c.orderTotal && c.qty ? c.orderTotal / c.qty / c.ratePerBag : 1) * 100) / 100,
  }));
}

export const runtime = "nodejs";

export async function POST(req) {
  const session = getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const body = await req.json();
  const isClient = session.role === "client";

  // Clients never supply paper rate or wastage — both are derived server-side.
  // Try live RM Master first, fall back to the static tables in calculator.js.
  let paperRate = Number(body.paperRate) || 0;
  if (isClient) {
    const rmTables = await fetchPaperRMTables();
    const live = lookupRMPaperRate(rmTables, {
      paperType: body.paperType, mill: body.mill,
      gsm: Number(body.gsm), bf: body.bf ? Number(body.bf) : null,
    });
    paperRate = live ?? lookupPaperRate({
      paperType: body.paperType, mill: body.mill,
      gsm: Number(body.gsm), bf: body.bf,
    });
  }

  const fallbackMargin = Number(session.marginPct ?? process.env.DEFAULT_CLIENT_MARGIN ?? 15);
  const { marginPct, discountPct } = isClient
    ? await currentClientPricing(session.email, fallbackMargin)
    : { marginPct: Number(body.profitPercent) || 10, discountPct: Number(body.discountPct) || 0 };

  const inputs = {
    bagType: body.bagType,
    width: Number(body.width) || 0,
    gusset: Number(body.gusset) || 0,
    height: Number(body.height) || 0,
    gsm: Number(body.gsm) || 0,
    paperRate,
    casePack: Number(body.casePack) || 1,
    orderQty: Number(body.orderQty) || 15000,
    // Admin may override; otherwise calculate.js applies rope=0.85 / flat=1.00 defaults.
    handleCost: body.handleCost !== undefined && body.handleCost !== "" ? Number(body.handleCost) : undefined,
    customWastage: isClient ? "" : (body.customWastage ?? ""),
    profitPercent: marginPct,
    printing: !!body.printing,
    colours: Number(body.colours) || 1,
    coverage: Number(body.coverage) || 30,
  };

  if (inputs.width <= 0 || inputs.height <= 0 || inputs.gsm <= 0 || inputs.paperRate <= 0) {
    return Response.json({ error: "Width, height, and GSM are required." }, { status: 400 });
  }

  // Compute raw result + curve (margin applied, discount not yet).
  const rawResult = calculate(inputs);
  const rawCurve = computeRateCurve(inputs);

  // Apply client discount to the selling price across all qty tiers.
  const discountFactor = discountPct ? (1 - discountPct / 100) : 1;
  const result = discountPct
    ? { ...rawResult, sellingPrice: Math.round(rawResult.sellingPrice * discountFactor * 10000) / 10000 }
    : rawResult;
  const curve = discountPct
    ? rawCurve.map((c) => ({
        ...c,
        ratePerBag: Math.round(c.ratePerBag * discountFactor * 10000) / 10000,
        costPerCase: Math.round(c.ratePerBag * discountFactor * inputs.casePack * 100) / 100,
        orderTotal: Math.round(c.ratePerBag * discountFactor * c.qty * 100) / 100,
      }))
    : rawCurve;

  const payload = { result, curve, role: session.role, discountPct };
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
