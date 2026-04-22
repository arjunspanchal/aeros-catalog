// Aeros Products Master — admin-only endpoint for the rate-card item picker.
// Reads the same catalog base the public /catalog page uses.

import { requireRateCardAdmin } from "@/lib/rate-cards/auth";
import { fetchCatalog } from "@/lib/catalog";

export const runtime = "nodejs";

export async function GET() {
  try { requireRateCardAdmin(); } catch (r) { return r; }
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
