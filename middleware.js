// Edge middleware. Uses Web Crypto (no node:crypto) for edge compat.
// Auth model after Phase 2: `/login` is the only login UI. Verifying a cookie
// still happens per-module — each module carries its own session cookie — but
// all three are minted in one go by /api/auth/*.
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

function redirectToLogin(req) {
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  const secret = process.env.SESSION_SECRET;

  // --- Hub: home, catalog, clearance ---
  if (pathname === "/" || pathname.startsWith("/catalog") || pathname.startsWith("/clearance")) {
    const token = req.cookies.get("aeros_hub_session")?.value;
    const payload = secret ? await verify(token, secret) : null;
    if (!payload) return redirectToLogin(req);
    return NextResponse.next();
  }

  // --- Calculator module ---
  if (pathname.startsWith("/api/calc/") || pathname.startsWith("/calculator")) {
    const token = req.cookies.get("aeros_session")?.value;
    const payload = secret ? await verify(token, secret) : null;
    if (!payload) return redirectToLogin(req);
    if (pathname.startsWith("/calculator/admin") && payload.role !== "admin") {
      return NextResponse.redirect(new URL("/calculator/client", req.url));
    }
    return NextResponse.next();
  }

  // --- Orders module ---
  if (pathname.startsWith("/api/orders/") || pathname.startsWith("/orders")) {
    const token = req.cookies.get("aeros_orders_session")?.value;
    const payload = secret ? await verify(token, secret) : null;

    if (!payload) {
      // The orders landing page handles its own routing when a session is missing.
      if (pathname === "/orders") return NextResponse.next();
      return redirectToLogin(req);
    }

    // Role guards for page routes.
    if (pathname.startsWith("/orders/admin") && payload.role !== "admin" && payload.role !== "factory_manager") {
      return NextResponse.redirect(new URL("/orders", req.url));
    }
    if (pathname.startsWith("/orders/manager") && payload.role === "customer") {
      return NextResponse.redirect(new URL("/orders/customer", req.url));
    }
    if (pathname.startsWith("/orders/customer") && payload.role !== "customer") {
      return NextResponse.redirect(new URL("/orders/manager", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/catalog/:path*",
    "/clearance/:path*",
    "/calculator/:path*",
    "/api/calc/:path*",
    "/orders/:path*",
    "/api/orders/:path*",
  ],
};
