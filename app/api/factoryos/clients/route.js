import { requireSession, requireAdmin } from "@/lib/factoryos/session";
import { listClients, createClient } from "@/lib/factoryos/repo";

export const runtime = "nodejs";

export async function GET() {
  try {
    requireSession();
    const clients = await listClients();
    return Response.json({ clients });
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}

export async function POST(req) {
  try {
    requireAdmin();
    const body = await req.json();
    if (!body.name) return Response.json({ error: "Name required" }, { status: 400 });
    const client = await createClient(body);
    return Response.json({ client });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: e.message || "Failed" }, { status: 500 });
  }
}
