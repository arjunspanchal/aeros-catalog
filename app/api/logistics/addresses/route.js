import { NextResponse } from "next/server";
import { getSession } from "@/lib/hub/session";
import { canUseLogistics, createAddress, updateAddress } from "@/lib/logistics/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/logistics/addresses — create a saved delivery address.
export async function POST(request) {
  const session = getSession();
  if (!canUseLogistics(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const address = await createAddress(await request.json());
    return NextResponse.json({ address });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Save failed" }, { status: 400 });
  }
}

// PATCH /api/logistics/addresses — update (e.g. flip the ODA flag).
export async function PATCH(request) {
  const session = getSession();
  if (!canUseLogistics(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const { id, ...patch } = await request.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const address = await updateAddress(id, patch);
    return NextResponse.json({ address });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Update failed" }, { status: 400 });
  }
}
