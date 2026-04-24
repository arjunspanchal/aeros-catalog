import { NextResponse } from "next/server";
import { getSession } from "@/lib/hub/session";
import { canManageCatalogue, createProduct } from "@/lib/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/catalog/products — create a new product row. Admin, FM, FE only.
export async function POST(request) {
  const session = getSession();
  if (!canManageCatalogue(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.productName || !String(body.productName).trim()) {
    return NextResponse.json({ error: "Product name is required" }, { status: 400 });
  }

  try {
    const product = await createProduct(body);
    return NextResponse.json({ product });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Create failed" },
      { status: 500 },
    );
  }
}
