import { requireSession, requireAdmin, getSession } from "@/lib/factoryos/session";
import { listCoatingJobs, createCoatingJob } from "@/lib/factoryos/repo";

export const runtime = "nodejs";

// GET /api/factoryos/coating — list all coating jobs
export async function GET() {
  try {
    requireSession();
    const jobs = await listCoatingJobs();
    return Response.json({ jobs });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: e.message || "Failed" }, { status: 500 });
  }
}

// POST /api/factoryos/coating — send-out flow
export async function POST(req) {
  try {
    requireAdmin();
    const s = getSession();
    const body = await req.json();
    const result = await createCoatingJob({
      sourceStockLineId: body.sourceStockLineId,
      coater: body.coater,
      coatingType: body.coatingType,
      qtySent: body.qtySent,
      sentDate: body.sentDate,
      notes: body.notes,
      createdByEmail: s?.email || "",
    });
    return Response.json(result);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: e.message || "Failed" }, { status: 400 });
  }
}
