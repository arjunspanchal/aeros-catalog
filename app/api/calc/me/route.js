// Returns the current client's live profile (margin, currency, etc.) from Airtable.
// Used by the ClientCalculator on mount so the UI picks up admin-side edits without
// waiting for the next login. Admin role gets an empty profile back.
import { airtableList, escapeFormula, TABLES } from "@/lib/calc/airtable";
import { getSession } from "@/lib/calc/session";

export const runtime = "nodejs";

export async function GET() {
  const session = getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  if (session.role !== "client") {
    return Response.json({ role: session.role });
  }
  const records = await airtableList(TABLES.clients(), {
    filterByFormula: `LOWER({Email})='${escapeFormula(session.email)}'`,
    maxRecords: 1,
  });
  const f = records[0]?.fields || {};
  return Response.json({
    role: "client",
    email: session.email,
    name: f.Name || "",
    company: f.Company || "",
    country: f.Country || "",
    preferredCurrency: f["Preferred Currency"] || "INR",
    preferredUnit: f["Preferred Units"] || "mm",
    marginPct: f["Margin %"] ?? null,
  });
}
