import { cookies } from "next/headers";
import { signSession, sessionCookie } from "@/lib/orders/auth";
import { ROLES } from "@/lib/orders/constants";

export const runtime = "nodejs";

export async function POST(req) {
  const { password } = await req.json().catch(() => ({}));
  const expected = process.env.ORDERS_ADMIN_PASSWORD;
  if (!expected) return Response.json({ error: "Admin password not configured" }, { status: 500 });
  if (!password || password !== expected) {
    return Response.json({ error: "Incorrect password" }, { status: 401 });
  }
  const token = signSession({ role: ROLES.ADMIN, name: "Admin" });
  cookies().set(sessionCookie(token));
  return Response.json({ ok: true, role: ROLES.ADMIN });
}
