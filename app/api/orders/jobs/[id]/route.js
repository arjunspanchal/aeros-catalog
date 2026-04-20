import { requireSession } from "@/lib/orders/session";
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
    const s = requireSession();
    const job = await getJob(params.id);
    if (!job) return Response.json({ error: "Not found" }, { status: 404 });
    if (!sessionCanSeeJob(s, job)) return Response.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const patch = {};
    let stageChanged = false;

    // Customers have one very specific permission: mark a Dispatched job as Delivered.
    const isCustomerDeliver =
      s.role === ROLES.CUSTOMER &&
      body.stage === "Delivered" &&
      job.stage === "Dispatched";

    if (body.stage !== undefined) {
      if (!canUpdateStage(s.role) && !isCustomerDeliver) {
        return Response.json({ error: "Not allowed" }, { status: 403 });
      }
      if (!STAGES.includes(body.stage)) return Response.json({ error: "Invalid stage" }, { status: 400 });
      if (body.stage !== job.stage) {
        patch.stage = body.stage;
        stageChanged = true;
      }
    }

    // Customers can: mark Delivered (above), and toggle Urgent.
    if (s.role === ROLES.CUSTOMER) {
      const allowedKeys = new Set(["stage", "note", "urgent"]);
      const extra = Object.keys(body).filter((k) => !allowedKeys.has(k));
      if (extra.length) return Response.json({ error: "Not allowed" }, { status: 403 });

      if (body.urgent !== undefined) patch.urgent = !!body.urgent;

      const willWrite = stageChanged || body.urgent !== undefined;
      const updated = willWrite ? await updateJob(job.id, patch) : job;

      if (stageChanged) {
        await addJobUpdate({
          jobId: job.id,
          stage: patch.stage,
          note: body.note || "Customer confirmed delivery",
          updatedByEmail: s.email || "",
          updatedByName: s.name || "",
        });
      } else if (body.urgent !== undefined) {
        // Log urgency toggles so managers see the signal in the timeline.
        await addJobUpdate({
          jobId: job.id,
          stage: job.stage,
          note: body.urgent ? "Customer marked order URGENT" : "Customer cleared urgent flag",
          updatedByEmail: s.email || "",
          updatedByName: s.name || "",
        });
      }
      return Response.json({ job: updated });
    }
    if (body.internalStatus !== undefined) patch.internalStatus = body.internalStatus;
    if (body.actionPoints !== undefined) patch.actionPoints = body.actionPoints;
    if (body.notes !== undefined) patch.notes = body.notes;
    if (body.expectedDispatchDate !== undefined) patch.expectedDispatchDate = body.expectedDispatchDate;
    if (body.estimatedDeliveryDate !== undefined) patch.estimatedDeliveryDate = body.estimatedDeliveryDate;
    // RM + production updates
    if (body.rmType !== undefined) patch.rmType = body.rmType;
    if (body.rmSupplier !== undefined) patch.rmSupplier = body.rmSupplier;
    if (body.paperType !== undefined) patch.paperType = body.paperType;
    if (body.gsm !== undefined) patch.gsm = body.gsm;
    if (body.rmSizeMm !== undefined) patch.rmSizeMm = body.rmSizeMm;
    if (body.rmQtySheets !== undefined) patch.rmQtySheets = body.rmQtySheets;
    if (body.rmQtyKgs !== undefined) patch.rmQtyKgs = body.rmQtyKgs;
    if (body.rmDeliveryDate !== undefined) patch.rmDeliveryDate = body.rmDeliveryDate;
    if (body.printingType !== undefined) patch.printingType = body.printingType;
    if (body.printingVendor !== undefined) patch.printingVendor = body.printingVendor;
    if (body.printingDueDate !== undefined) patch.printingDueDate = body.printingDueDate;
    if (body.productionDueDate !== undefined) patch.productionDueDate = body.productionDueDate;
    if (body.itemSize !== undefined) patch.itemSize = body.itemSize;
    if (body.urgent !== undefined) patch.urgent = !!body.urgent;
    if (body.transportMode !== undefined) patch.transportMode = body.transportMode;
    if (body.lrOrVehicleNumber !== undefined) patch.lrOrVehicleNumber = body.lrOrVehicleNumber;
    if (body.driverContact !== undefined) patch.driverContact = body.driverContact;

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
