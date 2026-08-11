import { NextResponse } from "next/server";
import { getSession } from "@/lib/hub/session";
import { canUseLogistics, saveQuote } from "@/lib/logistics/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/logistics/quotes — log a computed quote for later reconciliation
// against Delhivery's fortnightly invoices.
export async function POST(request) {
  const session = getSession();
  if (!canUseLogistics(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await request.json();
    for (const k of ["origin_kind", "origin_pincode", "dest_pincode", "lines", "breakdown"]) {
      if (body[k] == null) return NextResponse.json({ error: `Missing ${k}` }, { status: 400 });
    }
    const quote = await saveQuote(body, session);
    return NextResponse.json({ quote });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Save failed" }, { status: 400 });
  }
}
