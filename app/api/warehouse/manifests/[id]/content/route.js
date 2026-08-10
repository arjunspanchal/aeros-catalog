import { NextResponse } from "next/server";
import { getSession } from "@/lib/hub/session";
import {
  canManageManifests,
  getManifest,
  updateManifest,
} from "@/lib/warehouse/manifestGenerator";
import { saveGeneratorManifest, manifestTotals } from "@/lib/warehouse/dispatchManifest";

export const dynamic = "force-dynamic";

// Save the whole manifest — header, invoices and box types together. `header`
// carries the vehicle fields the lean generator edits inline; `vehicle_size`
// may also arrive on its own when the team accepts the suggested vehicle.
export async function PUT(req, { params }) {
  const session = getSession();
  if (!canManageManifests(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  let body;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const existing = await getManifest(params.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const { lines, invoices } = await saveGeneratorManifest(params.id, {
      invoices: body?.invoices || [],
      lines: body?.lines || [],
    });

    const patch = { ...body.header };
    if (typeof body?.vehicle_size === "string") patch.vehicle_size = body.vehicle_size.trim();
    const manifest =
      Object.keys(patch).length > 0
        ? await updateManifest(params.id, { ...existing, ...patch })
        : existing;

    return NextResponse.json({ manifest, lines, invoices, totals: manifestTotals(lines) });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
