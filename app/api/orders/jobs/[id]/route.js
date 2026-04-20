import { requireSession, requireInternal } from "@/lib/orders/session";
import {
  getJob,
  updateJob,
  listJobUpdates,
  addJobUpdate,
} from "@/lib/orders/repo";
import { STAGES, ROLES, canUpdateStage } from "@/lib/orders/constants";

export const runtime = "nodejs";

function sessionCanSeeJob(session, job) {
  if (session.role === ROLES.ADMIN || session.role === ROLES.FACTORY_MANAGER) return true;
  const myClients = new Set(session.clientIds || []);
  if (session.role === ROLES.ACCOUNT_MANAGER) {
    return job.clientIds.some((c) => myClients.has(c)) ||
      (job.customerManagerId && job.customerManagerId === session.userId);
  }
  if (session.role === ROLES.CUSTOMER) {
    return job.clientIds.some((c) => myClients.has(c));
  }
  return false;
}

export async function GET(_req, { params }) {
  try {
    const s = requireSession();
    const job = await getJob(params.id);
    if (!job) return Response.json({ error: "Not found" }, { status: 404 });
    if (!sessionCanSeeJob(s, job)) return Response.json({ error: "Forbidden" }, { status: 403 });
    const updates = await listJobUpdates(job.id);
    return Response.json({ job, updates });
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}

export async function PATCH(req, { params }) {
  try {
    const s = requireInternal();
    const job = await getJob(params.id);
    if (!job) return Response.json({ error: "Not found" }, { status: 404 });
    if (!sessionCanSeeJob(s, job)) return Response.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const patch = {};
    let stageChanged = false;

    if (body.stage !== undefined) {
      if (!canUpdateStage(s.role)) return Response.json({ error: "Not allowed" }, { status: 403 });
      if (!STAGES.includes(body.stage)) return Response.json({ error: "Invalid stage" }, { status: 400 });
      if (body.stage !== job.stage) {
        patch.stage = body.stage;
        stageChanged = true;
      }
    }
    if (body.internalStatus !== undefined) patch.internalStatus = body.internalStatus;
    if (body.actionPoints !== undefined) patch.actionPoints = body.actionPoints;
    if (body.notes !== undefined) patch.notes = body.notes;
    if (body.expectedDispatchDate !== undefined) patch.expectedDispatchDate = body.expectedDispatchDate;

    const updated = Object.keys(patch).length > 0 ? await updateJob(job.id, patch) : job;

    if (stageChanged || (body.note && body.note.trim())) {
      await addJobUpdate({
        jobId: job.id,
        stage: patch.stage || job.stage,
        note: body.note || "",
        updatedByEmail: s.email || "",
        updatedByName: s.name || (s.role === ROLES.ADMIN ? "Admin" : ""),
      });
    }
    return Response.json({ job: updated });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: e.message || "Failed" }, { status: 500 });
  }
}
