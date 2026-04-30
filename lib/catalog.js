// Server-side helper for the fresh product catalog. Reads + writes go to
// Supabase `master_products`. Image attachments are not yet wired (zero
// images in source data); attachProductPhoto / removeProductPhoto are
// preserved as no-ops for back-compat.

import { ROLES } from "./factoryos/constants.js";
import { airtableList, airtableGet, airtableCreate, airtableUpdate, airtableDelete } from "./db/airtableShim.js";

const WHATSAPP_NUMBER = "917977007497";
const EMAIL_ADDRESS = "clearance@aeros-x.com";

function buildWhatsAppUrl(product) {
  const price = product.pricePerUnit ? `₹${product.pricePerUnit}/unit` : "pricing TBC";
  const msg = `Hi, I'm interested in this product from Aeros — ${product.productName} (SKU: ${product.sku}) — Category: ${product.category} — Size: ${product.sizeVolume || "N/A"} — Price: ${price} — Could you share more details?`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

function buildEmailUrl(product) {
  const subject = `Product Inquiry: ${product.productName} (${product.sku})`;
  const price = product.pricePerUnit ? `₹${product.pricePerUnit}/unit` : "pricing TBC";
  const body = `Hi,\n\nI'm interested in the following product from your catalog:\n\nProduct: ${product.productName}\nSKU: ${product.sku}\nCategory: ${product.category}\nSize: ${product.sizeVolume || "N/A"}\nPrice: ${price}\n\nCould you please share more details and availability?\n\nThanks`;
  return `mailto:${EMAIL_ADDRESS}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function normalizeImages(field) {
  if (!Array.isArray(field)) return [];
  return field.map((a) => ({
    id: a.id,
    url: a.url,
    thumbnailUrl: a.thumbnails?.small?.url || a.url,
    largeUrl: a.thumbnails?.large?.url || a.url,
    filename: a.filename || "",
    size: typeof a.size === "number" ? a.size : null,
    type: a.type || "",
  }));
}

function normalizeProduct(record) {
  const f = record.fields || {};
  const productName = f["Product Name"];
  if (!productName) return null;
  const product = {
    id: record.id,
    productName,
    sku: f["SKU"] || "",
    category: f["Category"] || "Other",
    subCategory: f["Sub-Category / Style"] || "",
    sizeVolume: f["Size / Volume"] || "",
    colour: f["Colour / Print"] || "",
    material: f["Material"] || "",
    gsm: typeof f["GSM"] === "number" ? f["GSM"] : null,
    wallType: f["Wall Type"] || "",
    coating: f["Coating"] || "",
    unitsPerCase: typeof f["Units per Case"] === "number" ? f["Units per Case"] : null,
    casesPerPallet: typeof f["Cases per Pallet"] === "number" ? f["Cases per Pallet"] : null,
    pricePerUnit: typeof f["Price per Unit"] === "number" ? f["Price per Unit"] : null,
    pricePerCase: typeof f["Price per Case"] === "number" ? f["Price per Case"] : null,
    cartonDimensions: f["Carton Dimensions (mm)"] || "",
    topDiameter: typeof f["Top Diameter (mm)"] === "number" ? f["Top Diameter (mm)"] : null,
    bottomDiameter: typeof f["Bottom Diameter (mm)"] === "number" ? f["Bottom Diameter (mm)"] : null,
    heightMm: typeof f["Height (mm)"] === "number" ? f["Height (mm)"] : null,
    supplier: f["Supplier / Manufacturer"] || "",
    notes: f["Notes"] || "",
    images: normalizeImages(f["Image"]),
  };
  product.whatsappUrl = buildWhatsAppUrl(product);
  product.emailUrl = buildEmailUrl(product);
  return product;
}

export async function fetchCatalog() {
  const records = await airtableList("Products", { sort: [{ field: "Product Name", direction: "asc" }] });
  return records.map(normalizeProduct).filter(Boolean);
}

export function getCatalogCategories(products) {
  const set = new Set();
  for (const p of products) if (p.category) set.add(p.category);
  return Array.from(set).sort();
}

// ---------- Admin ----------
export function canManageCatalogue(session) {
  if (!session) return false;
  const factoryosRole = session.modules?.factoryos;
  const calculatorRole = session.modules?.calculator;
  if (factoryosRole === "customer") return false;
  if (calculatorRole === "client") return false;
  if (session.isAdmin) return true;
  return (
    factoryosRole === ROLES.ADMIN ||
    factoryosRole === ROLES.FACTORY_MANAGER ||
    factoryosRole === ROLES.FACTORY_EXECUTIVE ||
    factoryosRole === ROLES.ACCOUNT_MANAGER
  );
}

function normalizeAdmin(record) {
  const f = record.fields || {};
  return {
    id: record.id,
    productName: f["Product Name"] || "",
    sku: f["SKU"] || "",
    category: f["Category"] || "",
    subCategory: f["Sub-Category / Style"] || "",
    sizeVolume: f["Size / Volume"] || "",
    colour: f["Colour / Print"] || "",
    material: f["Material"] || "",
    gsm: typeof f["GSM"] === "number" ? f["GSM"] : null,
    wallType: f["Wall Type"] || "",
    coating: f["Coating"] || "",
    unitsPerCase: typeof f["Units per Case"] === "number" ? f["Units per Case"] : null,
    casesPerPallet: typeof f["Cases per Pallet"] === "number" ? f["Cases per Pallet"] : null,
    pricePerUnit: typeof f["Price per Unit"] === "number" ? f["Price per Unit"] : null,
    pricePerCase: typeof f["Price per Case"] === "number" ? f["Price per Case"] : null,
    cartonDimensions: f["Carton Dimensions (mm)"] || "",
    topDiameter: typeof f["Top Diameter (mm)"] === "number" ? f["Top Diameter (mm)"] : null,
    bottomDiameter: typeof f["Bottom Diameter (mm)"] === "number" ? f["Bottom Diameter (mm)"] : null,
    heightMm: typeof f["Height (mm)"] === "number" ? f["Height (mm)"] : null,
    supplier: f["Supplier / Manufacturer"] || "",
    notes: f["Notes"] || "",
    images: normalizeImages(f["Image"]),
  };
}

export async function listCatalogAdmin() {
  const records = await airtableList("Products", { sort: [{ field: "Product Name", direction: "asc" }] });
  return records.map(normalizeAdmin);
}

function toAirtableFields(draft) {
  const out = {};
  const text = (k, key) => {
    if (draft[key] !== undefined) out[k] = draft[key] === "" ? null : draft[key];
  };
  const num = (k, key) => {
    if (draft[key] !== undefined) {
      const v = draft[key];
      out[k] = v === "" || v === null ? null : Number(v);
    }
  };
  text("Product Name", "productName");
  text("SKU", "sku");
  text("Category", "category");
  text("Sub-Category / Style", "subCategory");
  text("Size / Volume", "sizeVolume");
  text("Colour / Print", "colour");
  text("Material", "material");
  num("GSM", "gsm");
  text("Wall Type", "wallType");
  text("Coating", "coating");
  num("Units per Case", "unitsPerCase");
  num("Cases per Pallet", "casesPerPallet");
  num("Price per Unit", "pricePerUnit");
  num("Price per Case", "pricePerCase");
  text("Carton Dimensions (mm)", "cartonDimensions");
  num("Top Diameter (mm)", "topDiameter");
  num("Bottom Diameter (mm)", "bottomDiameter");
  num("Height (mm)", "heightMm");
  text("Supplier / Manufacturer", "supplier");
  text("Notes", "notes");
  return out;
}

export async function updateProduct(id, draft) {
  const rec = await airtableUpdate("Products", id, toAirtableFields(draft));
  return normalizeAdmin(rec);
}

export async function createProduct(draft) {
  const rec = await airtableCreate("Products", toAirtableFields(draft));
  return normalizeAdmin(rec);
}

export async function deleteProduct(id) {
  return airtableDelete("Products", id);
}

export async function getProductById(id) {
  const rec = await airtableGet("Products", id);
  return rec ? normalizeAdmin(rec) : null;
}

// Image attachments — preserved as no-ops for back-compat. Catalog has zero
// images in current data; if/when we start uploading, wire these to a new
// `catalog-images` Storage bucket + master_products.image_path column.
export async function attachProductPhoto({ productId, contentType, filename, fileBase64 }) {
  return { ok: true, deferred: true };
}

export async function removeProductPhoto(productId, attachmentId) {
  return getProductById(productId);
}
