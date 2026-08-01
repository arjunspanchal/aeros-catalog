import { NextResponse } from "next/server";
import { getSession } from "@/lib/hub/session";
import { canUseLogistics, loadBootstrap } from "@/lib/logistics/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/logistics/bootstrap
// Everything the calculator needs in one shot: rate tables, config, vendors,
// saved addresses, slim product list. Auth: internal staff only.
export async function GET() {
  const session = getSession();
  if (!canUseLogistics(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const data = await loadBootstrap();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Load failed" }, { status: 500 });
  }
}
