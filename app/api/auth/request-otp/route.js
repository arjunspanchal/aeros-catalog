// Hub-level OTP request. Accepts any email that appears in Calc Clients OR
// Orders Users (active) — i.e. anyone currently authorised on any module.
// Stores the OTP in the Orders base's OTP Codes table (reused for Phase 1 to
// avoid introducing a new table).
import { airtableCreate, TABLES as ORDERS_TABLES } from "@/lib/factoryos/airtable";
import { generateOtp, normalizeEmail, sendOtpEmail } from "@/lib/hub/auth";
import { resolveEntitlements } from "@/lib/hub/users";

export const runtime = "nodejs";

const OTP_TTL_MINUTES = 10;

export async function POST(req) {
  const { email } = await req.json().catch(() => ({}));
  const cleaned = normalizeEmail(email);
  if (!cleaned || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
    return Response.json({ error: "Invalid email" }, { status: 400 });
  }

  const ents = await resolveEntitlements(cleaned);
  if (!ents) {
    return Response.json(
      { error: "No active account for this email. Ask admin to invite you." },
      { status: 404 },
    );
  }

  const code = generateOtp();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_TTL_MINUTES * 60_000);

  await airtableCreate(ORDERS_TABLES.otp(), {
    Email: cleaned,
    Code: code,
    "Expires At": expiresAt.toISOString(),
    Used: false,
    Created: now.toISOString(),
  });

  try {
    await sendOtpEmail({ to: cleaned, code, subjectPrefix: "Aeros", ttlMinutes: OTP_TTL_MINUTES });
  } catch (err) {
    console.error("Failed to send OTP email:", err);
    return Response.json({ error: "Could not send email. Try again." }, { status: 500 });
  }
  return Response.json({ ok: true });
}
