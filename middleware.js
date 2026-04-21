// Edge middleware. Uses Web Crypto (no node:crypto) for edge compat.
// Three modules:
//   /               + /catalog + /clearance  → gated by the Hub session cookie (aeros_hub_session)
//   /calculator                              → gated by the Calculator session cookie (aeros_session)
//   /orders                                  → gated by the Orders session cookie (aeros_orders_session)
// The hub login (/login) mints all three cookies up-front so a single sign-in
// unlocks every module the user is entitled to.
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

function redirectToHubLogin(req) {
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
    if (!payload) return redirectToHubLogin(req);
    return NextResponse.next();
  }

  // --- Calculator module ---
  if (pathname.startsWith("/api/calc/") || pathname.startsWith("/calculator")) {
    if (pathname.startsWith("/api/calc/auth/")) return NextResponse.next();
    if (pathname === "/calculator/login") return NextResponse.next();
    const token = req.cookies.get("aeros_session")?.value;
    const payload = secret ? await verify(token, secret) : null;
    if (!payload) {
      // Fall through to hub login if neither cookie is present; the calc
      // module's own /calculator/login stays available as a legacy entry point
      // via direct URL.
      const hubToken = req.cookies.get("aeros_hub_session")?.value;
      const hubPayload = secret ? await verify(hubToken, secret) : null;
      if (!hubPayload) return redirectToHubLogin(req);
      // Hub session exists but calc cookie missing — user doesn't have calc
      // access, so kick back to the home picker.
      return NextResponse.redirect(new URL("/", req.url));
    }
    if (pathname.startsWith("/calculator/admin") && payload.role !== "admin") {
      return NextResponse.redirect(new URL("/calculator/client", req.url));
    }
    return NextResponse.next();
  }

  // --- Orders module ---
  if (pathname.startsWith("/api/orders/") || pathname.startsWith("/orders")) {
    if (pathname.startsWith("/api/orders/auth/")) return NextResponse.next();
    if (pathname === "/orders/login") return NextResponse.next();

    const token = req.cookies.get("aeros_orders_session")?.value;
    const payload = secret ? await verify(token, secret) : null;

    if (!payload) {
      if (pathname === "/orders") return NextResponse.next();
      const hubToken = req.cookies.get("aeros_hub_session")?.value;
      const hubPayload = secret ? await verify(hubToken, secret) : null;
      if (!hubPayload) return redirectToHubLogin(req);
      return NextResponse.redirect(new URL("/", req.url));
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
