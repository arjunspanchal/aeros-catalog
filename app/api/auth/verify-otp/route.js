// Hub-level OTP verify. On success, mints THREE cookies:
//   - aeros_hub_session      — unified entitlements (home-page gating)
//   - aeros_session          — calculator-compatible (if user has calc access)
//   - aeros_orders_session   — orders-compatible (if user has orders access)
// This keeps Calculator + Orders modules working against their existing
// session readers without any changes in Phase 1.
import { cookies } from "next/headers";
import { airtableList, airtableUpdate, escapeFormula, TABLES as ORDERS_TABLES } from "@/lib/orders/airtable";
import { normalizeEmail, signSession as signHub, sessionCookie as hubCookie } from "@/lib/hub/auth";
import { resolveEntitlements } from "@/lib/hub/users";
import { signSession as signCalc, sessionCookie as calcCookie } from "@/lib/calc/auth";
import { signSession as signOrders, sessionCookie as ordersCookie } from "@/lib/orders/auth";

export const runtime = "nodejs";

export async function POST(req) {
  const { email, code } = await req.json().catch(() => ({}));
  const cleaned = normalizeEmail(email);
  if (!cleaned || !code) return Response.json({ error: "Email and code required" }, { status: 400 });

  const otps = await airtableList(ORDERS_TABLES.otp(), {
    filterByFormula: `AND({Email}='${escapeFormula(cleaned)}', {Code}='${escapeFormula(code)}', NOT({Used}))`,
    sort: [{ field: "Created", direction: "desc" }],
    maxRecords: 1,
  });
  const otp = otps[0];
  if (!otp) return Response.json({ error: "Invalid or expired code" }, { status: 401 });
  const expiresAt = new Date(otp.fields["Expires At"]);
  if (expiresAt.getTime() < Date.now()) {
    return Response.json({ error: "Code expired. Request a new one." }, { status: 401 });
  }
  await airtableUpdate(ORDERS_TABLES.otp(), otp.id, { Used: true });

  const ents = await resolveEntitlements(cleaned);
  if (!ents) {
    return Response.json({ error: "Account not found or inactive" }, { status: 403 });
  }

  // Mint hub cookie (always).
  const jar = cookies();
  const hubToken = signHub({
    email: ents.email,
    name: ents.name,
    isAdmin: ents.isAdmin,
    modules: ents.modules,
  });
  jar.set(hubCookie(hubToken));

  // Mint calc cookie if the user has calc access. Payload matches the shape
  // the calculator module expects: { role, email, marginPct }.
  if (ents.modules.calculator) {
    const calcToken = signCalc({
      role: ents.modules.calculator,
      email: ents.email,
      marginPct: ents.calcMarginPct ?? undefined,
    });
    jar.set(calcCookie(calcToken));
  }

  // Mint orders cookie if the user has orders access. Payload matches the
  // orders module's expected shape: { role, email, name, userId, clientIds }.
  if (ents.modules.orders) {
    const ordersToken = signOrders({
      role: ents.modules.orders,
      email: ents.email,
      name: ents.name,
      userId: ents.ordersUserId,
      clientIds: ents.ordersClientIds,
    });
    jar.set(ordersCookie(ordersToken));
  }

  return Response.json({ ok: true, modules: ents.modules });
}
