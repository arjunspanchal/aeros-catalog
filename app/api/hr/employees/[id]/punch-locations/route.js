// Recent check-in coordinates for one employee — feeds the "use last punch
// location" button when HR registers a WFH home geofence.
import { getSession, hasModule } from "@/lib/auth/session";
import { getEmployee, recentPunchLocations } from "@/lib/factoryos/repo";
import { hrScope, canAccessEmployee } from "@/lib/factoryos/hrScope";

export const runtime = "nodejs";

export async function GET(_req, { params }) {
  const session = getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  if (!hasModule(session, "hr")) return new Response("Forbidden", { status: 403 });
  const scope = await hrScope(session);
  if (!scope.isAdmin) {
    const emp = await getEmployee(params.id);
    if (!canAccessEmployee(scope, emp)) {
      return Response.json({ error: "Not your employee" }, { status: 403 });
    }
  }
  const locations = await recentPunchLocations(params.id, 10);
  return Response.json({ locations });
}
