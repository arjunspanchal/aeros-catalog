import { requireAdmin } from "@/lib/factoryos/session";
import { getRun, updateRun, deleteRun, listConsumptionForRun } from "@/lib/factoryos/repo";

export const runtime = "nodejs";

export async function GET(_req, { params }) {
  try {
    requireAdmin();
    const run = await getRun(params.id);
    if (!run) return Response.json({ error: "Run not found" }, { status: 404 });
    const consumption = await listConsumptionForRun(params.id);
    return Response.json({ run, consumption });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: e.message || "Failed" }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  try {
    requireAdmin();
    const body = await req.json();
    const run = await updateRun(params.id, body);
    return Response.json({ run });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: e.message || "Failed" }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    requireAdmin();
    const result = await deleteRun(params.id);
    return Response.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: e.message || "Failed" }, { status: 500 });
  }
}
