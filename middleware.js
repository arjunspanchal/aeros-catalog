// Edge middleware scoped to the calculator routes. Uses Web Crypto (no node:crypto)
// for edge compat. Catalog routes (/, /catalog, /api/chat) are unaffected.
import { NextResponse } from "next/server";

async function verify(token, secret) {
  if (!token || typeof token !== "string") return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const sigBytes = Uint8Array.from(atob(sig.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
  const ok = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(body));
  if (!ok) return null;
  try {
    const json = JSON.parse(atob(body.replace(/-/g, "+").replace(/_/g, "/")));
    if (json.exp && json.exp * 1000 < Date.now()) return null;
    return json;
  } catch { return null; }
}

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  // Auth endpoints are reachable without a session cookie.
  if (pathname.startsWith("/api/calc/auth/")) return NextResponse.next();
  // Login page is reachable without a session cookie.
  if (pathname === "/calculator/login") return NextResponse.next();

  const token = req.cookies.get("aeros_session")?.value;
  const secret = process.env.SESSION_SECRET;
  const payload = secret ? await verify(token, secret) : null;
  if (!payload) {
    const url = req.nextUrl.clone();
    url.pathname = "/calculator/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  // Role-based path guard. Admin-only API enforcement happens inside the route handlers.
  const isAdminPath = pathname.startsWith("/calculator/admin");
  if (isAdminPath && payload.role !== "admin") {
    return NextResponse.redirect(new URL("/calculator/client", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/calculator/:path*", "/api/calc/:path*"],
};
