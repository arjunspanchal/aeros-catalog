// Cup rate calculation. Clients get their per-client cup margin from the
// Users directory (falls back to bag margin). Admins supply margin in the
// request body. Pulls the selected product's dims + case pack + carton from
// Aeros Products Master, and the paper rate per GSM from the Paper RM master
// (Cupstock rows) — so nothing rate-sensitive lives client-side.

import { getSession } from "@/lib/calc/session";
import { currentClientCupPricing } from "@/lib/calc/user-directory";
import { fetchCupDimOptions } from "@/lib/calc/cup-products";
import {
  computeCupRateCurve, CASE_PACK_DEFAULTS, CUSTOMER_DEFAULTS,
  GSM_INNER_OPTS, GSM_OUTER_OPTS, BOTTOM_GSM,
} from "@/lib/calc/cup-calculator";
import { getCupstockRatesByGsms } from "@/lib/paper-rm";

export const runtime = "nodejs";

// Standard GSM per wall type when the caller doesn't specify one.
const DEFAULT_INNER_GSM = { "Single Wall": 280, "Double Wall": 280, "Ripple": 280 };
const DEFAULT_OUTER_GSM = { "Single Wall": 0,   "Double Wall": 250, "Ripple": 240 };

// Customer-facing cup coatings that affect inner sidewall only. Outer stays
// None on the Standard product line; bottom stays PE.
const ALLOWED_COATINGS = ["None", "PE", "2PE", "Aqueous", "PLA"];

function findProduct(options, wallType, size, sku) {
  const bucket = options?.[wallType]?.[size];
  if (!bucket) return null;
  return bucket.find((p) => p.sku === sku) || null;
}

function clampGsm(value, options, fallback) {
  const n = Number(value);
  if (options.includes(n)) return n;
  return fallback;
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

  const isDW = wallType === "Double Wall" || wallType === "Ripple";
  const casePack = product?.casePack || CASE_PACK_DEFAULTS[wallType]?.[size] || 500;

  const innerGsm = clampGsm(body.innerGsm, GSM_INNER_OPTS, DEFAULT_INNER_GSM[wallType] || 280);
  const outerGsm = isDW
    ? clampGsm(body.outerGsm, GSM_OUTER_OPTS, DEFAULT_OUTER_GSM[wallType] || 250)
    : 0;

  // Pull paper rates from Paper RM master (Cupstock) for each GSM we're
  // using. Falls back to CUSTOMER_DEFAULTS when the master doesn't have a
  // Base Rate populated for that GSM.
  const gsmSet = [innerGsm, BOTTOM_GSM, ...(isDW ? [outerGsm] : [])];
  let rmRates = {};
  let rmError = null;
  try {
    rmRates = await getCupstockRatesByGsms(gsmSet);
  } catch (e) {
    rmError = String(e?.message || e);
  }

  const innerRate = rmRates[innerGsm] ?? CUSTOMER_DEFAULTS.innerPaperRate;
  const outerRate = isDW ? (rmRates[outerGsm] ?? CUSTOMER_DEFAULTS.outerPaperRate) : CUSTOMER_DEFAULTS.outerPaperRate;
  const bottomRate = rmRates[BOTTOM_GSM] ?? CUSTOMER_DEFAULTS.bottomPaperRate;

  const cupInputs = {
    wallType, size,
    casePack,
    margin,
    inner: { gsm: innerGsm, coating, print, colours, coverage, paperRate: innerRate },
    outer: isDW
      ? { gsm: outerGsm, coating: "None", print: false, colours: 0, coverage: null, paperRate: outerRate }
      : { gsm: 0, coating: "None", print: false, colours: 0, coverage: null, paperRate: outerRate },
    bottomPaperRate: bottomRate,
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
    innerGsm, outerGsm,
    paperRates: { inner: innerRate, outer: outerRate, bottom: bottomRate },
    rmError,
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
