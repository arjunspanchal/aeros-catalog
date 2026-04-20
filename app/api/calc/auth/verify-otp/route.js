import { cookies } from "next/headers";
import { airtableList, airtableCreate, airtableUpdate, escapeFormula, TABLES } from "@/lib/calc/airtable";
import { signSession, sessionCookie, normalizeEmail } from "@/lib/calc/auth";

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

  // Mark OTP as used.
  await airtableUpdate(TABLES.otp(), otp.id, { Used: true });

  // Find or create the client.
  const clients = await airtableList(TABLES.clients(), {
    filterByFormula: `LOWER({Email})='${escapeFormula(cleaned)}'`,
    maxRecords: 1,
  });

  let clientRecord = clients[0];
  if (!clientRecord) {
    const defaultMargin = parseFloat(process.env.DEFAULT_CLIENT_MARGIN || "15");
    const created = await airtableCreate(TABLES.clients(), {
      Email: cleaned,
      "Margin %": defaultMargin,
      Status: "Active",
      Created: new Date().toISOString(),
      "Last Login": new Date().toISOString(),
    });
    clientRecord = created;
  } else {
    if (clientRecord.fields.Status === "Blocked") {
      return Response.json({ error: "Account blocked. Contact Aeros." }, { status: 403 });
    }
    await airtableUpdate(TABLES.clients(), clientRecord.id, { "Last Login": new Date().toISOString() });
  }

  const marginPct = Number(clientRecord.fields["Margin %"] ?? process.env.DEFAULT_CLIENT_MARGIN ?? 15);
  const token = signSession({ role: "client", email: cleaned, marginPct });
  cookies().set(sessionCookie(token));
  return Response.json({ ok: true, role: "client", email: cleaned });
}
