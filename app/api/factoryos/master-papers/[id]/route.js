import { requireSession } from "@/lib/factoryos/session";
import { ROLES } from "@/lib/factoryos/constants";
import { updateMasterPaper } from "@/lib/paper-rm";

export const runtime = "nodejs";

// PATCH /api/factoryos/master-papers/[id]
// STRICTLY admin-only — not FM/FE/Customer. Note this bypasses the shared
// `requireAdmin()` helper because that one also allows FACTORY_MANAGER, and
// the master rate table is sensitive enough that we want admin-only here.
export async function PATCH(req, { params }) {
  try {
    const s = requireSession();
    if (s.role !== ROLES.ADMIN) {
      return Response.json({ error: "Admin only" }, { status: 403 });
    }
    const body = await req.json();
    const masterPaper = await updateMasterPaper(params.id, body);
    return Response.json({ masterPaper });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: e.message || "Failed" }, { status: 400 });
  }
}
