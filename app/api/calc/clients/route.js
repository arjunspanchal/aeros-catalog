import { airtableList, airtableUpdate, TABLES } from "@/lib/calc/airtable";
import { requireAdmin } from "@/lib/calc/session";

export const runtime = "nodejs";

function recordToClient(r) {
  const f = r.fields || {};
  return {
    id: r.id,
    email: f.Email || "",
    name: f.Name || "",
    company: f.Company || "",
    marginPct: f["Margin %"] ?? null,
    status: f.Status || "Active",
    created: f.Created || "",
    lastLogin: f["Last Login"] || "",
    notes: f.Notes || "",
  };
}

export async function GET() {
  try { requireAdmin(); } catch (r) { return r; }
  const records = await airtableList(TABLES.clients(), { sort: [{ field: "Created", direction: "desc" }] });
  return Response.json(records.map(recordToClient));
}

export async function PATCH(req) {
  try { requireAdmin(); } catch (r) { return r; }
  const body = await req.json();
  if (!body.id) return Response.json({ error: "id required" }, { status: 400 });
  const fields = {};
  if (body.marginPct !== undefined) fields["Margin %"] = Number(body.marginPct);
  if (body.status !== undefined) fields.Status = body.status;
  if (body.name !== undefined) fields.Name = body.name;
  if (body.company !== undefined) fields.Company = body.company;
  if (body.notes !== undefined) fields.Notes = body.notes;
  const updated = await airtableUpdate(TABLES.clients(), body.id, fields);
  return Response.json(recordToClient(updated));
}
