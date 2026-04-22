// Cup rate calculation. Clients get their per-client cup margin from the
// Users directory (falls back to bag margin). Admins supply margin in the
// request body. Pulls the selected product's dims + case pack + carton from
// Aeros Products Master so the caller doesn't need to (keeps paper rates and
// overhead math server-side).

import { getSession } from "@/lib/calc/session";
import { currentClientCupPricing } from "@/lib/calc/user-directory";
import { fetchCupDimOptions } from "@/lib/calc/cup-products";
import { computeCupRateCurve, CASE_PACK_DEFAULTS } from "@/lib/calc/cup-calculator";

export const runtime = "nodejs";

// Sensible GSM defaults per wall type. Admin form still allows overrides;
// client form takes whatever the product record says or falls back to these.
const DEFAULT_GSM = {
  "Single Wall": { inner: 280, outer: null, bottom: 220 },
  "Double Wall": { inner: 280, outer: 250, bottom: 220 },
  "Ripple":      { inner: 280, outer: 240, bottom: 220 },
};

// Customer-facing cup coatings that affect inner sidewall only. Outer stays
// None (Standard product line) and bottom stays 2PE.
const ALLOWED_COATINGS = ["None", "PE", "2PE", "Aqueous", "PLA"];

function findProduct(options, wallType, size, sku) {
  const bucket = options?.[wallType]?.[size];
  if (!bucket) return null;
  return bucket.find((p) => p.sku === sku) || null;
}

export async function POST(req) {
  const session = getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => ({}));
  const isClient = session.role === "client";

  const wallType = body.wallType;
  const size = body.size;
  const sku = body.sku;
  if (!wallType || !size) {
    return Response.json({ error: "wallType and size are required" }, { status: 400 });
  }

  const options = await fetchCupDimOptions();
  const product = sku ? findProduct(options, wallType, size, sku) : null;

  const coating = ALLOWED_COATINGS.includes(body.coating) ? body.coating : "PE";
  const print = !!body.print;
  const colours = Math.max(1, Math.min(8, Number(body.colours) || 1));
  const coverage = [10, 30, 100].includes(Number(body.coverage)) ? Number(body.coverage) : 30;
  const orderQty = Math.max(1000, Number(body.orderQty) || 50000);

  // Margin: client's record wins; admin supplies via body.
  const fallbackMargin = Number(process.env.DEFAULT_CLIENT_MARGIN ?? 15);
  const margin = isClient
    ? (await currentClientCupPricing(session.email, fallbackMargin)).marginPct
    : (Number(body.margin) || fallbackMargin);

  const defaults = DEFAULT_GSM[wallType] || DEFAULT_GSM["Double Wall"];
  const isDW = wallType === "Double Wall" || wallType === "Ripple";
  const casePack = product?.casePack || CASE_PACK_DEFAULTS[wallType]?.[size] || 500;

  const cupInputs = {
    wallType, size,
    casePack,
    margin,
    inner: { gsm: defaults.inner, coating, print, colours, coverage },
    outer: isDW
      ? { gsm: defaults.outer || 250, coating: "None", print: false, colours: 0, coverage: null }
      : { gsm: 0, coating: "None", print: false, colours: 0, coverage: null },
  };

  const result = computeCupRateCurve(cupInputs);

  const payload = {
    product: product && {
      sku: product.sku,
      productName: product.productName,
      variant: product.variant,
      td: product.td, bd: product.bd, h: product.h,
      casePack: product.casePack || casePack,
      cartonDimensions: product.cartonDimensions,
    },
    wallType, size, coating, print, colours, coverage, orderQty, casePack,
    marginPct: result.marginPct,
    mfgPerCup: result.mfgPerCupBase,
    curve: result.curve,
    plateFlexo: result.plateFlexo,
    dieOffset: result.dieOffset,
    oneTimeTotal: result.oneTimeTotal,
    role: session.role,
  };

  return Response.json(payload);
}
