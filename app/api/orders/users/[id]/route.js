import { requireAdmin } from "@/lib/orders/session";
import { updateUser } from "@/lib/orders/repo";

export const runtime = "nodejs";

export async function PATCH(req, { params }) {
  try {
    requireAdmin();
    const body = await req.json();
    const user = await updateUser(params.id, body);
    return Response.json({ user });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: e.message || "Failed" }, { status: 500 });
  }
}
