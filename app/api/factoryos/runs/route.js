import { requireAdmin } from "@/lib/factoryos/session";
import { listRuns, createRun } from "@/lib/factoryos/repo";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    requireAdmin();
    const url = new URL(req.url);
    const runs = await listRuns({
      machineId: url.searchParams.get("machineId") || undefined,
      status: url.searchParams.get("status") || undefined,
      limit: url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : undefined,
    });
    return Response.json({ runs });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: e.message || "Failed" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const s = requireAdmin();
    const body = await req.json();
    if (!body.machineId) {
      return Response.json({ error: "Machine is required" }, { status: 400 });
    }
    const run = await createRun({
      ...body,
      operatorEmail: body.operatorEmail || s.email || "",
      operatorName: body.operatorName || s.name || "",
    });
    return Response.json({ run });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: e.message || "Failed" }, { status: 500 });
  }
}
