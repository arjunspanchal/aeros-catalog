// HMAC-signed session cookie. No DB dependency for session reads.
// Payload: { role: "admin" | "client", email?: string, marginPct?: number, exp: number }

import crypto from "node:crypto";

const COOKIE_NAME = "aeros_session";
const SESSION_DAYS = 30;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET must be set and at least 16 chars");
  return s;
}

function b64url(buf) {
  return Buffer.from(buf).toString("base64url");
}
function b64urlDecode(s) {
  return Buffer.from(s, "base64url");
}

export function signSession(payload) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400;
  const body = b64url(JSON.stringify({ ...payload, exp }));
  const sig = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifySession(token) {
  if (!token || typeof token !== "string") return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(b64urlDecode(body).toString("utf8"));
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function sessionCookie(token) {
  const maxAge = SESSION_DAYS * 86400;
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export function clearCookie() {
  return {
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
}

export const COOKIE = COOKIE_NAME;

export function normalizeEmail(e) {
  return String(e || "").trim().toLowerCase();
}

export function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}
