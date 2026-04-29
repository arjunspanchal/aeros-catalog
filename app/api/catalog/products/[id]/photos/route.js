// POST   /api/catalog/products/[id]/photos               — append an image
// DELETE /api/catalog/products/[id]/photos?attachmentId=x — remove an image
//
// Same shape as the clearance equivalent: JSON body with base64-encoded file,
// 5 MB cap server-side, image/* only. Returns the refreshed product so the UI
// can replace its row in place.

import { NextResponse } from "next/server";
import { getSession } from "@/lib/hub/session";
import {
  canManageCatalogue,
  attachProductPhoto,
  removeProductPhoto,
  getProductById,
} from "@/lib/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPE_PREFIX = "image/";

export async function POST(request, { params }) {
  const session = getSession();
  if (!canManageCatalogue(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = params?.id;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { filename, contentType, fileBase64 } = body || {};
  if (!filename || !contentType || !fileBase64) {
    return NextResponse.json(
      { error: "Missing filename, contentType, or fileBase64" },
      { status: 400 },
    );
  }
  if (!contentType.startsWith(ALLOWED_TYPE_PREFIX)) {
    return NextResponse.json({ error: "Only image uploads are allowed" }, { status: 400 });
  }
  // base64 length ≈ 4/3 × raw — enforce the 5 MB cap server-side too.
  const approxBytes = Math.ceil((fileBase64.length * 3) / 4);
  if (approxBytes > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `File too large. Max 5 MB, got ~${(approxBytes / (1024 * 1024)).toFixed(2)} MB` },
      { status: 413 },
    );
  }

  try {
    await attachProductPhoto({ productId: id, contentType, filename, fileBase64 });
    const product = await getProductById(id);
    return NextResponse.json({ product });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Upload failed" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const session = getSession();
  if (!canManageCatalogue(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = params?.id;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const url = new URL(request.url);
  const attachmentId = url.searchParams.get("attachmentId");
  if (!attachmentId) {
    return NextResponse.json({ error: "Missing attachmentId" }, { status: 400 });
  }

  try {
    const product = await removeProductPhoto(id, attachmentId);
    return NextResponse.json({ product });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Delete failed" }, { status: 500 });
  }
}
