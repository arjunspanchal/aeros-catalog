import { cookies } from "next/headers";
import { airtableList, airtableUpdate, escapeFormula, TABLES } from "@/lib/orders/airtable";
import { signSession, sessionCookie, normalizeEmail } from "@/lib/orders/auth";
import { findUserByEmail } from "@/lib/orders/repo";

export const runtime = "nodejs";

export async function POST(req) {
  const { email, code } = await req.json().catch(() => ({}));
  const cleaned = normalizeEmail(email);
  if (!cleaned || !code) return Response.json({ error: "Email and code required" }, { status: 400 });

  const otps = await airtableList(TABLES.otp(), {
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
  await airtableUpdate(TABLES.otp(), otp.id, { Used: true });

  const user = await findUserByEmail(cleaned);
  if (!user || !user.active) {
    return Response.json({ error: "Account not found or inactive" }, { status: 403 });
  }

  const token = signSession({
    role: user.role,
    email: user.email,
    name: user.name,
    userId: user.id,
    clientIds: user.clientIds,
  });
  cookies().set(sessionCookie(token));
  return Response.json({ ok: true, role: user.role });
}
