import { requireAdmin, requireInternal } from "@/lib/orders/session";
import { listEmployees, createEmployee } from "@/lib/orders/repo";
import { ROLES } from "@/lib/orders/constants";

export const runtime = "nodejs";

// Admin sees everyone. Factory Manager sees only employees assigned to them.
// Other internal roles don't have HR visibility at all (blocked by middleware).
export async function GET(req) {
  try {
    const s = requireInternal();
    const url = new URL(req.url);
    const activeOnly = url.searchParams.get("active") === "1";
    const managerUserId =
      s.role === ROLES.ADMIN
        ? url.searchParams.get("managerUserId") || undefined
        : s.userId; // FM is force-scoped to themselves.
    const employees = await listEmployees({ activeOnly, managerUserId });
    return Response.json({ employees });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: e.message || "Failed" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const s = requireAdmin();
    const body = await req.json();
    if (!body.name || !body.name.trim()) {
      return Response.json({ error: "Name required" }, { status: 400 });
    }
    if (body.aadhar && !/^\d{12}$/.test(String(body.aadhar).replace(/\s+/g, ""))) {
      return Response.json({ error: "Aadhar must be 12 digits" }, { status: 400 });
    }
    const monthlySalary = Number(body.monthlySalary);
    if (!Number.isFinite(monthlySalary) || monthlySalary < 0) {
      return Response.json({ error: "Valid monthly salary required" }, { status: 400 });
    }

    // Factory Manager can only create employees reporting to themselves —
    // ignore any managerId they send and bind ownership to their userId.
    // Admin can assign any manager (or none).
    const managerId =
      s.role === ROLES.FACTORY_MANAGER ? s.userId : body.managerId || null;

    const employee = await createEmployee({
      name: body.name.trim(),
      aadhar: (body.aadhar || "").replace(/\s+/g, ""),
      phone: body.phone || "",
      monthlySalary,
      joiningDate: body.joiningDate || null,
      managerId,
      otEligible: !!body.otEligible,
      designation: body.designation || "",
      notes: body.notes || "",
      active: true,
    });
    return Response.json({ employee });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: e.message || "Failed" }, { status: 500 });
  }
}
