import { NextResponse } from "next/server";
import { getSession } from "@/lib/hub/session";
import { canManageManifests, createManifest } from "@/lib/warehouse/manifestGenerator";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const session = getSession();
  if (!canManageManifests(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  let body;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  try {
    const manifest = await createManifest(body || {}, session?.email);
    return NextResponse.json({ manifest });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
