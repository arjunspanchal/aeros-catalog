import { airtableList, airtableCreate, airtableDelete, TABLES } from "@/lib/calc/airtable";
import { getSession, requireAdmin } from "@/lib/calc/session";

export const runtime = "nodejs";

function recordToSpec(r) {
  const f = r.fields || {};
  return {
    id: r.id,
    code: f.Code || "",
    brand: f.Brand || "",
    item: f.Item || "",
    bagType: f["Bag Type"] === "Handle" ? "handle" : f["Bag Type"] === "V-Bottom" ? "v_bottom_gusset" : "sos",
    width: f["Width mm"] ?? 0,
    gusset: f["Gusset mm"] ?? 0,
    height: f["Height mm"] ?? 0,
    paperType: f["Paper Type"] || "",
    millName: f.Mill || "",
    gsm: f.GSM ?? 0,
    bf: f.BF ?? "",
    casePack: f["Case Pack"] ?? 0,
    printing: !!f.Printing,
    colours: f.Colours ?? 1,
    coverage: f["Coverage %"] ?? 30,
    lockedWastage: f["Locked Wastage %"] ?? null,
  };
}

export async function GET() {
  if (!getSession()) return new Response("Unauthorized", { status: 401 });
  const records = await airtableList(TABLES.bagSpecs(), { sort: [{ field: "Code", direction: "asc" }] });
  return Response.json(records.map(recordToSpec));
}

const BAG_TYPE_OUT = { sos: "SOS", handle: "Handle", v_bottom_gusset: "V-Bottom" };

export async function POST(req) {
  try { requireAdmin(); } catch (r) { return r; }
  const body = await req.json();
  const fields = {
    Code: body.code,
    Brand: body.brand || undefined,
    Item: body.item || undefined,
    "Bag Type": BAG_TYPE_OUT[body.bagType] || "SOS",
    "Width mm": Number(body.width) || undefined,
    "Gusset mm": Number(body.gusset) || undefined,
    "Height mm": Number(body.height) || undefined,
    "Paper Type": body.paperType || undefined,
    Mill: body.millName || undefined,
    GSM: body.gsm ? Number(body.gsm) : undefined,
    BF: body.bf ? Number(body.bf) : undefined,
    "Case Pack": body.casePack ? Number(body.casePack) : undefined,
    Printing: !!body.printing,
    Colours: body.colours ? Number(body.colours) : undefined,
    "Coverage %": body.coverage ? Number(body.coverage) : undefined,
    "Locked Wastage %": body.lockedWastage ? Number(body.lockedWastage) : undefined,
  };
  Object.keys(fields).forEach((k) => fields[k] === undefined && delete fields[k]);
  const created = await airtableCreate(TABLES.bagSpecs(), fields);
  return Response.json(recordToSpec(created));
}

export async function DELETE(req) {
  try { requireAdmin(); } catch (r) { return r; }
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  await airtableDelete(TABLES.bagSpecs(), id);
  return Response.json({ ok: true });
}
