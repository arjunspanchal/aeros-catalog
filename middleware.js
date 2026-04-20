// Edge middleware. Uses Web Crypto (no node:crypto) for edge compat.
// Guards two independent modules: /calculator (cookie aeros_session) and /orders (cookie aeros_orders_session).
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
  const secret = process.env.SESSION_SECRET;

  // --- Calculator module ---
  if (pathname.startsWith("/api/calc/") || pathname.startsWith("/calculator")) {
    if (pathname.startsWith("/api/calc/auth/")) return NextResponse.next();
    if (pathname === "/calculator/login") return NextResponse.next();
    const token = req.cookies.get("aeros_session")?.value;
    const payload = secret ? await verify(token, secret) : null;
    if (!payload) {
      const url = req.nextUrl.clone();
      url.pathname = "/calculator/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    if (pathname.startsWith("/calculator/admin") && payload.role !== "admin") {
      return NextResponse.redirect(new URL("/calculator/client", req.url));
    }
    return NextResponse.next();
  }

  // --- Orders module ---
  if (pathname.startsWith("/api/orders/") || pathname.startsWith("/orders")) {
    // Public: auth endpoints + login page + the root redirect page.
    if (pathname.startsWith("/api/orders/auth/")) return NextResponse.next();
    if (pathname === "/orders/login") return NextResponse.next();

    const token = req.cookies.get("aeros_orders_session")?.value;
    const payload = secret ? await verify(token, secret) : null;

    if (!payload) {
      // The root /orders page handles its own routing — let it render the landing/redirect logic.
      if (pathname === "/orders") return NextResponse.next();
      const url = req.nextUrl.clone();
      url.pathname = "/orders/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
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
  matcher: ["/calculator/:path*", "/api/calc/:path*", "/orders/:path*", "/api/orders/:path*"],
};
