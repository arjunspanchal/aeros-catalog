import { cookies } from "next/headers";
import { verifySession, COOKIE } from "@/lib/hub/auth";

export function getSession() {
  const token = cookies().get(COOKIE)?.value;
  return verifySession(token);
}

export function hasModule(session, mod) {
  return !!session?.modules?.[mod];
}

// True if the user has access to at least one module. Admin always true.
export function hasAnyAccess(session) {
  if (!session) return false;
  if (session.isAdmin) return true;
  return Object.values(session.modules || {}).some(Boolean);
}
