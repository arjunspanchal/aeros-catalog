import { requireSession, requireInternal } from "@/lib/factoryos/session";
import { listJobsForSession, createJob } from "@/lib/factoryos/repo";
import { STAGES, ROLES, CATEGORIES } from "@/lib/factoryos/constants";

export const runtime = "nodejs";

export async function GET() {
  try {
    const s = requireSession();
    const jobs = await listJobsForSession(s);
    return Response.json({ jobs });
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}

export async function POST(req) {
  try {
    const s = requireInternal();
    if (s.role !== ROLES.ADMIN && s.role !== ROLES.ACCOUNT_MANAGER) {
      return Response.json({ error: "Only admin or account manager can create jobs" }, { status: 403 });
    }
    const body = await req.json();
    if (!body.jNumber || !body.clientId || !body.item) {
      return Response.json({ error: "J#, client, and item are required" }, { status: 400 });
    }
    // Every new job must map to a row in Aeros Products Master so FG inventory can be tracked by SKU.
    if (!body.masterSku || !String(body.masterSku).trim()) {
      return Response.json(
        { error: "Pick a product from the master catalogue — required so this job maps to an SKU." },
        { status: 400 },
      );
    }
    if (body.stage && !STAGES.includes(body.stage)) {
      return Response.json({ error: "Invalid stage" }, { status: 400 });
    }
    if (body.category && !CATEGORIES.includes(body.category)) {
      return Response.json({ error: "Invalid category" }, { status: 400 });
    }
    const job = await createJob({
      stage: STAGES[0],
      ...body,
    });
    return Response.json({ job });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: e.message || "Failed" }, { status: 500 });
  }
}
