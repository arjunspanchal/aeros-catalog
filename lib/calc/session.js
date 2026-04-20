// Helper used by server routes + server components to read the current session.
// Next 14: cookies() is sync.
import { cookies } from "next/headers";
import { verifySession, COOKIE } from "@/lib/calc/auth";

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
  if (s.role !== "admin") throw new Response("Forbidden", { status: 403 });
  return s;
}
