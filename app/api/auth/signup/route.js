// Self-service sign-up for a new rate-calculator client.
//
// Creates a Users row with Calculator Role = "Client", then sends an OTP to
// the email. The caller then POSTs to /api/auth/verify-otp to complete the
// login. No session is minted here — the verify-otp step does that.
//
// Guard-rails:
//  - refuse if an Active Users row already exists for that email
//  - if an Inactive row exists, reactivate and refresh details (one-shot
//    recovery for a previously-invited client who never finished setup)
//  - never grant Admin or FactoryOS roles via this path

import { airtableCreate, airtableList, airtableUpdate, escapeFormula, TABLES } from "@/lib/factoryos/airtable";
import { generateOtp, normalizeEmail, sendOtpEmail } from "@/lib/hub/auth";

export const runtime = "nodejs";

const OTP_TTL_MINUTES = 10;

function validPhone(s) {
  if (!s) return true; // phone optional
  const digits = String(s).replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const company = String(body.company || "").trim();
  const location = String(body.location || "").trim();
  const email = normalizeEmail(body.email || "");
  const phone = String(body.phone || "").trim();

  if (!name) return Response.json({ error: "Name is required" }, { status: 400 });
  if (!company) return Response.json({ error: "Company name is required" }, { status: 400 });
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Valid email is required" }, { status: 400 });
  }
  if (!validPhone(phone)) return Response.json({ error: "Phone looks invalid" }, { status: 400 });

  // Look up any existing Users row for this email.
  const existing = await airtableList(TABLES.users(), {
    filterByFormula: `LOWER({Email})='${escapeFormula(email)}'`,
    maxRecords: 1,
  });

  if (existing[0]) {
    const row = existing[0];
    const f = row.fields || {};
    const active = f.Active !== false;
    if (active) {
      // Already signed up — direct them to the normal login.
      return Response.json(
        { error: "An account with this email already exists. Use the Email tab to sign in." },
        { status: 409 },
      );
    }
    // Inactive row — revive it as a calculator client.
    await airtableUpdate(TABLES.users(), row.id, {
      Name: f.Name || name,
      Company: company,
      Country: location || undefined,
      Phone: phone || undefined,
      Active: true,
      "Calculator Role": "Client",
    });
  } else {
    await airtableCreate(TABLES.users(), {
      Email: email,
      Name: name,
      Company: company,
      Country: location || undefined,
      Phone: phone || undefined,
      Active: true,
      "Calculator Role": "Client",
      Created: new Date().toISOString(),
    });
  }

  // Mint + send OTP so the caller can proceed to /api/auth/verify-otp.
  const code = generateOtp();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_TTL_MINUTES * 60_000);
  await airtableCreate(TABLES.otp(), {
    Email: email,
    Code: code,
    "Expires At": expiresAt.toISOString(),
    Used: false,
    Created: now.toISOString(),
  });

  try {
    await sendOtpEmail({
      to: email,
      code,
      subjectPrefix: "Aeros — confirm your sign-up",
      ttlMinutes: OTP_TTL_MINUTES,
    });
  } catch (err) {
    console.error("Sign-up OTP email failed:", err);
    return Response.json({ error: "Could not send verification email. Try again." }, { status: 500 });
  }

  return Response.json({ ok: true });
}
