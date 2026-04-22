// Centralised session guards for /api/rate-cards. These read the unified hub
// session (same cookie the AppHeader uses) and check module entitlements.

import { getSession } from "@/lib/hub/session";

export function getRateCardSession() {
  const s = getSession();
  if (!s) return null;
  const role = s.isAdmin ? "admin" : s?.modules?.rate_cards;
  if (!role) return null;
  return { ...s, rateCardRole: role };
}

export function requireRateCardSession() {
  const s = getRateCardSession();
  if (!s) throw new Response("Unauthorized", { status: 401 });
  return s;
}

export function requireRateCardAdmin() {
  const s = requireRateCardSession();
  if (s.rateCardRole !== "admin") throw new Response("Forbidden", { status: 403 });
  return s;
}
