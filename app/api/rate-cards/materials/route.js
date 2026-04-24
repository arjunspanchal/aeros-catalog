// Paper RM Master — admin-only endpoint used by the rate-card Material picker.
// Reads the shared Paper RM Airtable base (same source FactoryOS + Cup
// Calculator already use) so renames/additions there flow into every module
// without duplication.

import { requireRateCardAdmin } from "@/lib/rate-cards/auth";
import { listMasterPapers } from "@/lib/paper-rm";

export const runtime = "nodejs";
// requireRateCardAdmin reads cookies — skip static prerender so the build
// doesn't invoke the handler without a request context.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    requireRateCardAdmin();
  } catch (r) {
    if (r instanceof Response) return r;
    return Response.json({ error: String(r?.message || r) }, { status: 500 });
  }
  try {
    const materials = await listMasterPapers();
    // Slim the payload to just what the picker needs.
    const slim = materials.map((m) => ({
      id: m.id,
      materialName: m.materialName,
      gsm: m.gsm,
      bf: m.bf,
      type: m.type,
      supplier: m.supplier,
      form: m.form,
      millCoating: m.millCoating,
    }));
    return Response.json(slim);
  } catch (err) {
    return Response.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
