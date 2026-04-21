import { requireAdmin } from "@/lib/factoryos/session";
import { deleteAttendance } from "@/lib/factoryos/repo";

export const runtime = "nodejs";

export async function DELETE(_req, { params }) {
  try {
    requireAdmin();
    await deleteAttendance(params.id);
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: e.message || "Failed" }, { status: 500 });
  }
}
