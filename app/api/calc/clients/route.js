import { airtableList, airtableCreate, airtableUpdate, airtableDelete, escapeFormula, TABLES } from "@/lib/calc/airtable";
import { requireAdmin } from "@/lib/calc/session";
import { normalizeEmail } from "@/lib/calc/auth";

export const runtime = "nodejs";

function recordToClient(r) {
  const f = r.fields || {};
  return {
    id: r.id,
    email: f.Email || "",
    name: f.Name || "",
    company: f.Company || "",
    country: f.Country || "",
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

export async function POST(req) {
  try { requireAdmin(); } catch (r) { return r; }
  const body = await req.json();
  const email = normalizeEmail(body.email);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Valid email is required" }, { status: 400 });
  }
  if (body.marginPct === undefined || body.marginPct === null || body.marginPct === "") {
    return Response.json({ error: "Margin % is required" }, { status: 400 });
  }

  const existing = await airtableList(TABLES.clients(), {
    filterByFormula: `LOWER({Email})='${escapeFormula(email)}'`,
    maxRecords: 1,
  });
  if (existing.length) {
    return Response.json({ error: "A client with that email already exists" }, { status: 409 });
  }

  const created = await airtableCreate(TABLES.clients(), {
    Email: email,
    Name: body.name || undefined,
    Company: body.company || undefined,
    Country: body.country || undefined,
    "Margin %": Number(body.marginPct),
    Status: body.status || "Active",
    Created: new Date().toISOString(),
    Notes: body.notes || undefined,
  });
  return Response.json(recordToClient(created));
}

export async function PATCH(req) {
  try { requireAdmin(); } catch (r) { return r; }
  const body = await req.json();
  if (!body.id) return Response.json({ error: "id required" }, { status: 400 });

  const fields = {};
  if (body.email !== undefined) {
    const email = normalizeEmail(body.email);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: "Invalid email" }, { status: 400 });
    }
    const clash = await airtableList(TABLES.clients(), {
      filterByFormula: `AND(LOWER({Email})='${escapeFormula(email)}', RECORD_ID()!='${body.id}')`,
      maxRecords: 1,
    });
    if (clash.length) return Response.json({ error: "Another client already uses that email" }, { status: 409 });
    fields.Email = email;
  }
  if (body.marginPct !== undefined) fields["Margin %"] = Number(body.marginPct);
  if (body.status !== undefined) fields.Status = body.status;
  if (body.name !== undefined) fields.Name = body.name;
  if (body.company !== undefined) fields.Company = body.company;
  if (body.country !== undefined) fields.Country = body.country;
  if (body.notes !== undefined) fields.Notes = body.notes;

  const updated = await airtableUpdate(TABLES.clients(), body.id, fields);
  return Response.json(recordToClient(updated));
}

export async function DELETE(req) {
  try { requireAdmin(); } catch (r) { return r; }
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  await airtableDelete(TABLES.clients(), id);
  return Response.json({ ok: true });
}
