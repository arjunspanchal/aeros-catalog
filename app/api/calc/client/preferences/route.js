// Lets the logged-in client update their own preferences (currency, etc.) without
// admin intervention. Only mutates the Airtable record matching the session email.
import { airtableList, airtableUpdate, escapeFormula, TABLES } from "@/lib/calc/airtable";
import { getSession } from "@/lib/calc/session";
import { CURRENCIES } from "@/lib/calc/calculator";

export const runtime = "nodejs";

export async function POST(req) {
  const session = getSession();
  if (!session || session.role !== "client") return new Response("Unauthorized", { status: 401 });
  const body = await req.json().catch(() => ({}));

  const fields = {};
  if (body.preferredCurrency !== undefined) {
    if (!CURRENCIES[body.preferredCurrency]) {
      return Response.json({ error: "Unsupported currency" }, { status: 400 });
    }
    fields["Preferred Currency"] = body.preferredCurrency;
  }
  if (body.preferredUnit !== undefined) {
    if (!["mm", "cm", "in"].includes(body.preferredUnit)) {
      return Response.json({ error: "Unsupported unit" }, { status: 400 });
    }
    fields["Preferred Units"] = body.preferredUnit;
  }
  if (Object.keys(fields).length === 0) {
    return Response.json({ error: "Nothing to update" }, { status: 400 });
  }

  const [record] = await airtableList(TABLES.clients(), {
    filterByFormula: `LOWER({Email})='${escapeFormula(session.email)}'`,
    maxRecords: 1,
  });
  if (!record) return Response.json({ error: "Client record not found" }, { status: 404 });

  await airtableUpdate(TABLES.clients(), record.id, fields);
  return Response.json({ ok: true, ...fields });
}
