import { NextResponse } from "next/server";
import { getSession } from "@/lib/hub/session";
import {
  canManageClearance,
  attachItemPhoto,
  removeItemPhoto,
  listItemsAdmin,
} from "@/lib/clearance/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB per file
const ALLOWED_TYPE_PREFIX = "image/"; // images only for now

// POST /api/clearance/items/[id]/photos
// Body: { filename, contentType, fileBase64 }
export async function POST(request, { params }) {
  const session = getSession();
  if (!canManageClearance(session)) {
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
    return NextResponse.json(
      { error: "Only image uploads are allowed" },
      { status: 400 },
    );
  }

  // base64 length ≈ 4/3 × raw size; enforce 5 MB raw cap server-side.
  const approxBytes = Math.ceil((fileBase64.length * 3) / 4);
  if (approxBytes > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      {
        error: `File too large. Max 5 MB, got ~${(approxBytes / (1024 * 1024)).toFixed(
          2,
        )} MB`,
      },
      { status: 413 },
    );
  }

  try {
    await attachItemPhoto({ itemId: id, contentType, filename, fileBase64 });
    // Return the refreshed item so the UI can replace its row cleanly.
    const item = await fetchItemById(id);
    return NextResponse.json({ item });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Upload failed" },
      { status: 500 },
    );
  }
}

// DELETE /api/clearance/items/[id]/photos?attachmentId=xxx
export async function DELETE(request, { params }) {
  const session = getSession();
  if (!canManageClearance(session)) {
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
    const item = await removeItemPhoto(id, attachmentId);
    return NextResponse.json({ item });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Delete failed" },
      { status: 500 },
    );
  }
}

// Fetch a single normalized item by id. Cheaper than re-listing, but the
// admin helper only exposes a bulk list today — so we list + find. For the
// scale of the clearance base (≤ a few hundred rows) this is fine.
async function fetchItemById(id) {
  const all = await listItemsAdmin();
  return all.find((i) => i.id === id) || null;
}
