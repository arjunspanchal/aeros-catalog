// Shared OTP helpers used by both /calculator and /orders.
// Email delivery is centralised here; per-module OTP storage stays in each
// module's own Airtable base (different users, different scopes).

export function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Send a one-time code via Resend. In dev (no RESEND_API_KEY) we log to the
 * server console so OTP logins still work locally.
 *
 * @param {object} args
 * @param {string} args.to             - recipient email
 * @param {string} args.code           - 6-digit code
 * @param {string} args.subjectPrefix  - e.g. "Aeros" or "Aeros Orders"
 * @param {number} args.ttlMinutes     - code lifetime, shown to the recipient
 */
export async function sendOtpEmail({ to, code, subjectPrefix = "Aeros", ttlMinutes = 10 }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.OTP_FROM_EMAIL || "Aeros <noreply@aeros.local>";
  if (!apiKey) {
    console.log(`[dev] ${subjectPrefix} OTP for ${to}: ${code}`);
    return;
  }
  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  await resend.emails.send({
    from,
    to,
    subject: `${subjectPrefix} — your login code: ${code}`,
    text: `Your one-time login code is ${code}.\nIt expires in ${ttlMinutes} minutes.`,
    html: `<p>Your one-time login code is <strong style="font-size:20px;letter-spacing:2px">${code}</strong>.</p><p>It expires in ${ttlMinutes} minutes.</p>`,
  });
}
