import { airtableCreate, TABLES } from "@/lib/orders/airtable";
import { generateOtp, normalizeEmail } from "@/lib/orders/auth";
import { findUserByEmail } from "@/lib/orders/repo";

export const runtime = "nodejs";

const OTP_TTL_MINUTES = 10;

async function sendOtpEmail(to, code) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.OTP_FROM_EMAIL || "Aeros <noreply@aeros.local>";
  if (!apiKey) {
    console.log(`[dev] Orders OTP for ${to}: ${code}`);
    return;
  }
  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  await resend.emails.send({
    from,
    to,
    subject: `Aeros Orders — your login code: ${code}`,
    text: `Your one-time login code is ${code}.\nIt expires in ${OTP_TTL_MINUTES} minutes.`,
    html: `<p>Your one-time login code is <strong style="font-size:20px;letter-spacing:2px">${code}</strong>.</p><p>It expires in ${OTP_TTL_MINUTES} minutes.</p>`,
  });
}

export async function POST(req) {
  const { email } = await req.json().catch(() => ({}));
  const cleaned = normalizeEmail(email);
  if (!cleaned || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
    return Response.json({ error: "Invalid email" }, { status: 400 });
  }

  const user = await findUserByEmail(cleaned);
  if (!user || !user.active) {
    // Generic error — don't reveal whether the email is registered.
    return Response.json({ error: "No active account for this email. Ask admin to invite you." }, { status: 404 });
  }

  const code = generateOtp();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_TTL_MINUTES * 60_000);

  await airtableCreate(TABLES.otp(), {
    Email: cleaned,
    Code: code,
    "Expires At": expiresAt.toISOString(),
    Used: false,
    Created: now.toISOString(),
  });

  try {
    await sendOtpEmail(cleaned, code);
  } catch (err) {
    console.error("Failed to send OTP email:", err);
    return Response.json({ error: "Could not send email. Try again." }, { status: 500 });
  }
  return Response.json({ ok: true });
}
