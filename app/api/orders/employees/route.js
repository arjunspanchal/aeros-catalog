import { requireAdmin, requireInternal } from "@/lib/orders/session";
import { listEmployees, createEmployee } from "@/lib/orders/repo";

export const runtime = "nodejs";

// Any internal user can read the roster (managers need to see their reports).
// Only Admin + Factory Manager can register/edit — requireAdmin covers both.
export async function GET(req) {
  try {
    requireInternal();
    const url = new URL(req.url);
    const activeOnly = url.searchParams.get("active") === "1";
    const managerUserId = url.searchParams.get("managerUserId") || undefined;
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
    requireAdmin();
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
    const employee = await createEmployee({
      name: body.name.trim(),
      aadhar: (body.aadhar || "").replace(/\s+/g, ""),
      phone: body.phone || "",
      monthlySalary,
      joiningDate: body.joiningDate || null,
      managerId: body.managerId || null,
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
