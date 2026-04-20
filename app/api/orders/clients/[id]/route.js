import { requireAdmin } from "@/lib/orders/session";
import { updateClient } from "@/lib/orders/repo";

export const runtime = "nodejs";

export async function PATCH(req, { params }) {
  try {
    requireAdmin();
    const body = await req.json();
    if (body.name !== undefined && !body.name.trim()) {
      return Response.json({ error: "Name cannot be empty" }, { status: 400 });
    }
    const client = await updateClient(params.id, body);
    return Response.json({ client });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: e.message || "Failed" }, { status: 500 });
  }
}
