import { NextResponse } from "next/server";
import { getSession } from "@/lib/hub/session";
import { canManageCatalogue, updateProduct, deleteProduct } from "@/lib/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PATCH /api/catalog/products/[id] — update editable fields on a product.
export async function PATCH(request, { params }) {
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

  try {
    const product = await updateProduct(id, body);
    return NextResponse.json({ product });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Update failed" },
      { status: 500 },
    );
  }
}

// DELETE /api/catalog/products/[id] — remove a product row.
export async function DELETE(_request, { params }) {
  const session = getSession();
  if (!canManageCatalogue(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = params?.id;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    await deleteProduct(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Delete failed" },
      { status: 500 },
    );
  }
}
