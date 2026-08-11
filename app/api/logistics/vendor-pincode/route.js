import { NextResponse } from "next/server";
import { getSession } from "@/lib/hub/session";
import { canUseLogistics, saveVendorPincode } from "@/lib/logistics/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/logistics/vendor-pincode — remember a vendor's origin pincode
// the first time it is entered so future quotes pre-fill it.
export async function POST(request) {
  const session = getSession();
  if (!canUseLogistics(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const { vendorId, pincode } = await request.json();
    if (!vendorId || !/^\d{6}$/.test(String(pincode || ""))) {
      return NextResponse.json({ error: "vendorId and 6-digit pincode required" }, { status: 400 });
    }
    const vendor = await saveVendorPincode(vendorId, String(pincode));
    return NextResponse.json({ vendor });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Save failed" }, { status: 400 });
  }
}
