// Backend helpers for the Clearance Stock management page.
// Scoped to the Clearance base (AIRTABLE_BASE_ID / AIRTABLE_TABLE_ID).
//
// Unlike lib/airtable.js (which dedupes + filters branded items for the
// public-facing read-only view), this module returns the RAW records so
// staff can upload a photo to the exact row that needs it.
//
// Server-side only. Writes are protected by session role checks in the
// page and API routes that call these helpers.

import { ROLES } from "@/lib/factoryos/constants";

const AIRTABLE_API = "https://api.airtable.com/v0";
const CONTENT_API = "https://content.airtable.com/v0";

function env(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

// Scoped Clearance PAT (1.2). Falls back to legacy AIRTABLE_TOKEN during cutover.
function pickToken() {
  const v = process.env.AIRTABLE_PAT_CLEARANCE || process.env.AIRTABLE_TOKEN;
  if (!v) throw new Error("Missing env var: AIRTABLE_PAT_CLEARANCE (or legacy AIRTABLE_TOKEN)");
  return v;
}

function baseUrl() {
  const baseId = env("AIRTABLE_BASE_ID");
  const tableId = env("AIRTABLE_TABLE_ID");
  return `${AIRTABLE_API}/${baseId}/${tableId}`;
}

function headers() {
  return {
    Authorization: `Bearer ${pickToken()}`,
    "Content-Type": "application/json",
  };
}

// ---------- Access control ----------

// Admin, Factory Manager, or Factory Executive — the three roles allowed to
// manage clearance stock. Check both isAdmin (shared admin login) and the
// FactoryOS module role (per-user login).
//
// Customer roles (factoryos: "customer", calculator: "client") always return
// false, even if isAdmin is set — the staff-access banner must never leak to
// a customer-facing session.
export function canManageClearance(session) {
  if (!session) return false;
  const factoryosRole = session.modules?.factoryos;
  const calculatorRole = session.modules?.calculator;
  if (factoryosRole === "customer") return false;
  if (calculatorRole === "client") return false;
  if (session.isAdmin) return true;
  return factoryosRole === ROLES.FACTORY_MANAGER || factoryosRole === ROLES.FACTORY_EXECUTIVE;
}

// ---------- Read ----------

// Fetch every record with minimal normalization. No dedup, no brand filter.
// Admins need the raw list so they can see which specific row a photo should
// attach to (since the public view may merge duplicates).
export async function listItemsAdmin() {
  const records = [];
  let offset;
  const url = new URL(baseUrl());
  url.searchParams.set("pageSize", "100");

  do {
    if (offset) url.searchParams.set("offset", offset);
    else url.searchParams.delete("offset");
    const res = await fetch(url.toString(), {
      headers: headers(),
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Airtable list failed: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    records.push(...(data.records || []));
    offset = data.offset;
  } while (offset);

  return records.map(normalize);
}

function normalize(record) {
  const f = record.fields || {};
  const photos = Array.isArray(f.Photos) ? f.Photos : [];
  return {
    id: record.id,
    itemName: f["Item Name"] || "",
    brand: f.Brand || "",
    category: f.Category || "",
    stockQuantity: typeof f["Stock Quantity"] === "number" ? f["Stock Quantity"] : null,
    unit: f.Unit || "pcs",
    casePack: typeof f["Case Pack"] === "number" ? f["Case Pack"] : null,
    // Price is stored in INR (₹) in Airtable.
    price: typeof f.Price === "number" ? f.Price : null,
    description: f.Description || "",
    specifications: f.Specifications || "",
    status: f.Status || "",
    photos: photos.map((a) => ({
      id: a.id,
      url: a.url,
      thumbnailUrl: a.thumbnails?.small?.url || a.url,
      largeUrl: a.thumbnails?.large?.url || a.url,
      filename: a.filename,
      size: a.size,
      type: a.type,
    })),
  };
}

// ---------- Write: field updates ----------

// Patch any subset of the editable fields for an item.
// Only keys present in `fields` are touched; everything else is left alone.
export async function updateItem(id, fields) {
  const patch = {};
  if (fields.itemName !== undefined) patch["Item Name"] = fields.itemName;
  if (fields.brand !== undefined) patch.Brand = fields.brand;
  if (fields.category !== undefined) patch.Category = fields.category;
  if (fields.stockQuantity !== undefined) {
    patch["Stock Quantity"] =
      fields.stockQuantity === null || fields.stockQuantity === ""
        ? null
        : Number(fields.stockQuantity);
  }
  if (fields.unit !== undefined) patch.Unit = fields.unit;
  if (fields.casePack !== undefined) {
    patch["Case Pack"] =
      fields.casePack === null || fields.casePack === ""
        ? null
        : Number(fields.casePack);
  }
  if (fields.price !== undefined) {
    patch.Price =
      fields.price === null || fields.price === ""
        ? null
        : Number(fields.price);
  }
  if (fields.description !== undefined) patch.Description = fields.description;
  if (fields.specifications !== undefined) patch.Specifications = fields.specifications;
  if (fields.status !== undefined) patch.Status = fields.status;

  const res = await fetch(`${baseUrl()}/${id}`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify({ fields: patch, typecast: true }),
  });
  if (!res.ok) {
    throw new Error(`Update failed: ${res.status} ${await res.text()}`);
  }
  return normalize(await res.json());
}

// ---------- Write: photo attach / remove ----------

// Append one photo to the Photos field of a given item.
// `fileBase64` must be a raw base64 string (no data: prefix).
// Airtable's content API caps at 5MB per upload — we enforce that in the API route.
export async function attachItemPhoto({ itemId, contentType, filename, fileBase64 }) {
  const baseId = env("AIRTABLE_BASE_ID");
  const url = `${CONTENT_API}/${baseId}/${itemId}/${encodeURIComponent("Photos")}/uploadAttachment`;
  const res = await fetch(url, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ contentType, filename, file: fileBase64 }),
  });
  if (!res.ok) {
    throw new Error(`Upload failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

// Remove one photo from the Photos field.
// Airtable's attachment field is replace-only, so we GET the current list,
// filter out the attachment id we're removing, and PATCH the trimmed list back.
export async function removeItemPhoto(itemId, attachmentId) {
  const getRes = await fetch(`${baseUrl()}/${itemId}`, {
    headers: headers(),
    cache: "no-store",
  });
  if (!getRes.ok) {
    throw new Error(`Fetch failed: ${getRes.status} ${await getRes.text()}`);
  }
  const record = await getRes.json();
  const current = Array.isArray(record.fields?.Photos) ? record.fields.Photos : [];
  const remaining = current
    .filter((a) => a.id !== attachmentId)
    .map((a) => ({ id: a.id }));

  const patchRes = await fetch(`${baseUrl()}/${itemId}`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify({
      fields: { Photos: remaining.length ? remaining : null },
    }),
  });
  if (!patchRes.ok) {
    throw new Error(`Remove failed: ${patchRes.status} ${await patchRes.text()}`);
  }
  return normalize(await patchRes.json());
}
