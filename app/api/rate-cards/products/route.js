// Aeros Products Master — admin-only endpoint for the rate-card item picker.
// Reads the same catalog base the public /catalog page uses.

import { requireRateCardAdmin } from "@/lib/rate-cards/auth";
import { fetchCatalog } from "@/lib/catalog";

export const runtime = "nodejs";
// Reads cookies via requireRateCardAdmin() — opt out of static prerendering so
// Vercel doesn't try to invoke the handler at build time (where there's no
// request context and the auth throw isn't returned cleanly).
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    requireRateCardAdmin();
  } catch (r) {
    // requireRateCardAdmin throws a Response on auth failure; pass it through.
    // Anything else (unexpected) becomes a 500 with the message.
    if (r instanceof Response) return r;
    return Response.json({ error: String(r?.message || r) }, { status: 500 });
  }
  try {
    const products = await fetchCatalog();
    // Slim the payload — we only need identity + spec fields to pre-fill.
    const slim = products.map((p) => ({
      id: p.id,
      sku: p.sku,
      productName: p.productName,
      category: p.category,
      subCategory: p.subCategory,
      sizeVolume: p.sizeVolume,
      material: p.material,
      gsm: p.gsm,
      wallType: p.wallType,
      coating: p.coating,
      unitsPerCase: p.unitsPerCase,
      cartonDimensions: p.cartonDimensions,
      colour: p.colour,
    }));
    return Response.json(slim);
  } catch (err) {
    return Response.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
