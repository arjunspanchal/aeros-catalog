import { cookies } from "next/headers";
import { verifySession, COOKIE } from "@/lib/orders/auth";
import { ROLES } from "@/lib/orders/constants";

export function getSession() {
  const token = cookies().get(COOKIE)?.value;
  return verifySession(token);
}

export function requireSession() {
  const s = getSession();
  if (!s) throw new Response("Unauthorized", { status: 401 });
  return s;
}

export function requireAdmin() {
  const s = requireSession();
  if (s.role !== ROLES.ADMIN) throw new Response("Forbidden", { status: 403 });
  return s;
}

export function requireInternal() {
  const s = requireSession();
  if (s.role === ROLES.CUSTOMER) throw new Response("Forbidden", { status: 403 });
  return s;
}
