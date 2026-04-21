// Hub-level admin login. One shared password (`ADMIN_PASSWORD`) grants admin
// access to every module. Mints all three cookies (hub + calc + orders) with
// admin-equivalent role.
import { cookies } from "next/headers";
import { signSession as signHub, sessionCookie as hubCookie } from "@/lib/hub/auth";
import { signSession as signCalc, sessionCookie as calcCookie } from "@/lib/calc/auth";
import { signSession as signOrders, sessionCookie as ordersCookie } from "@/lib/orders/auth";
import { ROLES } from "@/lib/orders/constants";
import { adminEntitlements } from "@/lib/hub/users";

export const runtime = "nodejs";

export async function POST(req) {
  const { password } = await req.json().catch(() => ({}));
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return Response.json({ error: "Admin password not configured" }, { status: 500 });
  if (!password || password !== expected) {
    return Response.json({ error: "Incorrect password" }, { status: 401 });
  }

  const ents = adminEntitlements();
  const jar = cookies();

  jar.set(hubCookie(signHub({
    email: ents.email,
    name: ents.name,
    isAdmin: true,
    modules: ents.modules,
  })));
  jar.set(calcCookie(signCalc({ role: "admin" })));
  jar.set(ordersCookie(signOrders({ role: ROLES.ADMIN, name: "Admin" })));

  return Response.json({ ok: true });
}
