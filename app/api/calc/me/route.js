// Returns the current client's live profile (margin, currency, etc.) from the
// unified Users directory. Used by the ClientCalculator on mount so the UI
// picks up admin-side edits without waiting for the next login.
import { getSession } from "@/lib/calc/session";
import { findCalcClientByEmail } from "@/lib/calc/user-directory";

export const runtime = "nodejs";

export async function GET() {
  const session = getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  if (session.role !== "client") {
    return Response.json({ role: session.role });
  }
  const client = await findCalcClientByEmail(session.email);
  return Response.json({
    role: "client",
    email: session.email,
    name: client?.name || "",
    company: client?.company || "",
    country: client?.country || "",
    preferredCurrency: client?.preferredCurrency || "INR",
    preferredUnit: client?.preferredUnit || "mm",
    marginPct: client?.marginPct ?? null,
  });
}
