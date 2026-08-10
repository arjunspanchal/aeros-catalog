import { NextResponse } from "next/server";
import { getSession } from "@/lib/hub/session";
import {
  canManageManifests,
  getManifest,
  updateManifest,
  softDeleteManifest,
} from "@/lib/warehouse/manifestGenerator";

export const dynamic = "force-dynamic";

export async function PATCH(req, { params }) {
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
    const manifest = await updateManifest(params.id, { ...existing, ...body });
    return NextResponse.json({ manifest });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function DELETE(_req, { params }) {
  const session = getSession();
  // Deleting the manifest cascades its invoices + lines, so gate on admin —
  // same bar as deleting a vehicle dispatch.
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await softDeleteManifest(params.id);
  return NextResponse.json({ ok: true });
}
