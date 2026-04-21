import { requireSession, requireAdmin } from "@/lib/orders/session";
import { listMachines, createMachine } from "@/lib/orders/repo";

export const runtime = "nodejs";

export async function GET() {
  try {
    requireSession();
    const machines = await listMachines();
    return Response.json({ machines });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: e.message || "Failed" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    requireAdmin();
    const body = await req.json();
    if (!body.name || !body.name.trim()) {
      return Response.json({ error: "Name required" }, { status: 400 });
    }
    const machine = await createMachine({
      ...body,
      name: body.name.trim(),
    });
    return Response.json({ machine });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: e.message || "Failed" }, { status: 500 });
  }
}
