import { getSession } from "@/lib/orders/session";
import { findUserByEmail, updateUser } from "@/lib/orders/repo";

export const runtime = "nodejs";

// Self-service profile update for any logged-in non-admin user.
export async function PATCH(req) {
  const s = getSession();
  if (!s) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!s.email) return Response.json({ error: "Admin profile is not editable here" }, { status: 400 });

  const user = await findUserByEmail(s.email);
  if (!user) return Response.json({ error: "User not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const allowed = {};
  if (body.name !== undefined) allowed.name = body.name;
  if (body.designation !== undefined) allowed.designation = body.designation;
  if (body.phone !== undefined) allowed.phone = body.phone;

  const updated = await updateUser(user.id, allowed);
  return Response.json({ user: updated });
}

export async function GET() {
  const s = getSession();
  if (!s) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!s.email) return Response.json({ profile: null });
  const user = await findUserByEmail(s.email);
  if (!user) return Response.json({ error: "User not found" }, { status: 404 });
  return Response.json({
    profile: {
      email: user.email,
      name: user.name,
      designation: user.designation,
      phone: user.phone,
      role: user.role,
    },
  });
}
