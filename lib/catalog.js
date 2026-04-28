// Server-side helper for the fresh product catalog.
// Reads from a separate Airtable base — CATALOG_BASE_ID / CATALOG_TABLE_ID.

import { ROLES } from '@/lib/factoryos/constants';

const AIRTABLE_API = 'https://api.airtable.com/v0';

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required env var ${name}. ` +
      `Check your .env.local file or Vercel Environment Variables.`
    );
  }
  return value;
}

// Scoped Products Master PAT (1.2). Read+write — `lib/catalog.js` exports
// updateProduct/createProduct/deleteProduct used by the /catalog/manage admin
// UI (gated by canManageCatalogue). Falls back to legacy AIRTABLE_TOKEN during
// cutover.
function pickToken() {
  const v = process.env.AIRTABLE_PAT_PRODUCTS || process.env.AIRTABLE_TOKEN;
  if (!v) {
    throw new Error(
      'Missing required env var AIRTABLE_PAT_PRODUCTS (or legacy AIRTABLE_TOKEN). ' +
      'Check your .env.local file or Vercel Environment Variables.'
    );
  }
  return v;
}

function catalogUrl() {
  const baseId = required('CATALOG_BASE_ID');
  const tableId = required('CATALOG_TABLE_ID');
  return `${AIRTABLE_API}/${baseId}/${tableId}`;
}

function catalogHeaders() {
  return {
    Authorization: `Bearer ${pickToken()}`,
    'Content-Type': 'application/json',
  };
}

export async function fetchCatalog() {
  const token = pickToken();
  const baseId = required('CATALOG_BASE_ID');
  const tableId = required('CATALOG_TABLE_ID');

  const records = [];
  let offset;

  do {
    const params = new URLSearchParams();
    params.set('pageSize', '100');
    if (offset) params.set('offset', offset);

    const url = `${AIRTABLE_API}/${baseId}/${tableId}?${params.toString()}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 300 }, // refresh every 5 minutes
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Airtable API error ${res.status}: ${body.slice(0, 300)}`);
    }

    const data = await res.json();
    records.push(...(data.records || []));
    offset = data.offset;
  } while (offset);

  return records.map(normalizeProduct).filter(Boolean);
}

const WHATSAPP_NUMBER = '917977007497';
const EMAIL_ADDRESS = 'clearance@aeros-x.com';

function buildWhatsAppUrl(product) {
  const price = product.pricePerUnit ? `₹${product.pricePerUnit}/unit` : 'pricing TBC';
  const msg = `Hi, I'm interested in this product from Aeros — ${product.productName} (SKU: ${product.sku}) — Category: ${product.category} — Size: ${product.sizeVolume || 'N/A'} — Price: ${price} — Could you share more details?`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

function buildEmailUrl(product) {
  const subject = `Product Inquiry: ${product.productName} (${product.sku})`;
  const price = product.pricePerUnit ? `₹${product.pricePerUnit}/unit` : 'pricing TBC';
  const body = `Hi,\n\nI'm interested in the following product from your catalog:\n\nProduct: ${product.productName}\nSKU: ${product.sku}\nCategory: ${product.category}\nSize: ${product.sizeVolume || 'N/A'}\nPrice: ${price}\n\nCould you please share more details and availability?\n\nThanks`;
  return `mailto:${EMAIL_ADDRESS}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function normalizeProduct(record) {
  const f = record.fields || {};

  const productName = f['Product Name'];
  if (!productName) return null;

  const product = {
    id: record.id,
    productName,
    sku: f['SKU'] || '',
    category: f['Category'] || 'Other',
    subCategory: f['Sub-Category / Style'] || '',
    sizeVolume: f['Size / Volume'] || '',
    colour: f['Colour / Print'] || '',
    material: f['Material'] || '',
    gsm: typeof f['GSM'] === 'number' ? f['GSM'] : null,
    wallType: f['Wall Type'] || '',
    coating: f['Coating'] || '',
    unitsPerCase: typeof f['Units per Case'] === 'number' ? f['Units per Case'] : null,
    casesPerPallet: typeof f['Cases per Pallet'] === 'number' ? f['Cases per Pallet'] : null,
    pricePerUnit: typeof f['Price per Unit'] === 'number' ? f['Price per Unit'] : null,
    pricePerCase: typeof f['Price per Case'] === 'number' ? f['Price per Case'] : null,
    cartonDimensions: f['Carton Dimensions (mm)'] || '',
    topDiameter: typeof f['Top Diameter (mm)'] === 'number' ? f['Top Diameter (mm)'] : null,
    bottomDiameter: typeof f['Bottom Diameter (mm)'] === 'number' ? f['Bottom Diameter (mm)'] : null,
    heightMm: typeof f['Height (mm)'] === 'number' ? f['Height (mm)'] : null,
    supplier: f['Supplier / Manufacturer'] || '',
    notes: f['Notes'] || '',
  };

  product.whatsappUrl = buildWhatsAppUrl(product);
  product.emailUrl = buildEmailUrl(product);

  return product;
}

export function getCatalogCategories(products) {
  const set = new Set();
  for (const p of products) {
    if (p.category) set.add(p.category);
  }
  return Array.from(set).sort();
}

// ---------- Admin / editor helpers ----------

// Admin, Factory Manager, or Factory Executive may edit the product catalogue.
// Customer-tier sessions never pass, even if isAdmin is set elsewhere.
export function canManageCatalogue(session) {
  if (!session) return false;
  const factoryosRole = session.modules?.factoryos;
  const calculatorRole = session.modules?.calculator;
  if (factoryosRole === 'customer') return false;
  if (calculatorRole === 'client') return false;
  if (session.isAdmin) return true;
  return (
    factoryosRole === ROLES.ADMIN ||
    factoryosRole === ROLES.FACTORY_MANAGER ||
    factoryosRole === ROLES.FACTORY_EXECUTIVE
  );
}

// Admin listing returns every row (including rows missing Product Name) so a
// manager can fix incomplete entries. Uses no-store so edits are immediate.
export async function listCatalogAdmin() {
  const records = [];
  let offset;
  do {
    const params = new URLSearchParams();
    params.set('pageSize', '100');
    if (offset) params.set('offset', offset);
    const res = await fetch(`${catalogUrl()}?${params.toString()}`, {
      headers: catalogHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error(`Airtable list failed: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    records.push(...(data.records || []));
    offset = data.offset;
  } while (offset);
  return records.map(normalizeAdmin);
}

function normalizeAdmin(record) {
  const f = record.fields || {};
  return {
    id: record.id,
    productName: f['Product Name'] || '',
    sku: f['SKU'] || '',
    category: f['Category'] || '',
    subCategory: f['Sub-Category / Style'] || '',
    sizeVolume: f['Size / Volume'] || '',
    colour: f['Colour / Print'] || '',
    material: f['Material'] || '',
    gsm: typeof f['GSM'] === 'number' ? f['GSM'] : null,
    wallType: f['Wall Type'] || '',
    coating: f['Coating'] || '',
    unitsPerCase: typeof f['Units per Case'] === 'number' ? f['Units per Case'] : null,
    casesPerPallet: typeof f['Cases per Pallet'] === 'number' ? f['Cases per Pallet'] : null,
    pricePerUnit: typeof f['Price per Unit'] === 'number' ? f['Price per Unit'] : null,
    pricePerCase: typeof f['Price per Case'] === 'number' ? f['Price per Case'] : null,
    cartonDimensions: f['Carton Dimensions (mm)'] || '',
    topDiameter: typeof f['Top Diameter (mm)'] === 'number' ? f['Top Diameter (mm)'] : null,
    bottomDiameter: typeof f['Bottom Diameter (mm)'] === 'number' ? f['Bottom Diameter (mm)'] : null,
    heightMm: typeof f['Height (mm)'] === 'number' ? f['Height (mm)'] : null,
    supplier: f['Supplier / Manufacturer'] || '',
    notes: f['Notes'] || '',
  };
}

// Map our camelCase draft → Airtable field names. Only keys present in the
// draft are written; empty string → null so the field clears.
function toAirtableFields(draft) {
  const out = {};
  const text = (k, key) => {
    if (draft[key] !== undefined) out[k] = draft[key] === '' ? null : draft[key];
  };
  const num = (k, key) => {
    if (draft[key] !== undefined) {
      const v = draft[key];
      out[k] = v === '' || v === null ? null : Number(v);
    }
  };
  text('Product Name', 'productName');
  text('SKU', 'sku');
  text('Category', 'category');
  text('Sub-Category / Style', 'subCategory');
  text('Size / Volume', 'sizeVolume');
  text('Colour / Print', 'colour');
  text('Material', 'material');
  num('GSM', 'gsm');
  text('Wall Type', 'wallType');
  text('Coating', 'coating');
  num('Units per Case', 'unitsPerCase');
  num('Cases per Pallet', 'casesPerPallet');
  num('Price per Unit', 'pricePerUnit');
  num('Price per Case', 'pricePerCase');
  text('Carton Dimensions (mm)', 'cartonDimensions');
  num('Top Diameter (mm)', 'topDiameter');
  num('Bottom Diameter (mm)', 'bottomDiameter');
  num('Height (mm)', 'heightMm');
  text('Supplier / Manufacturer', 'supplier');
  text('Notes', 'notes');
  return out;
}

export async function updateProduct(id, draft) {
  const res = await fetch(`${catalogUrl()}/${id}`, {
    method: 'PATCH',
    headers: catalogHeaders(),
    body: JSON.stringify({ fields: toAirtableFields(draft), typecast: true }),
  });
  if (!res.ok) {
    throw new Error(`Update failed: ${res.status} ${await res.text()}`);
  }
  return normalizeAdmin(await res.json());
}

export async function createProduct(draft) {
  const res = await fetch(catalogUrl(), {
    method: 'POST',
    headers: catalogHeaders(),
    body: JSON.stringify({ fields: toAirtableFields(draft), typecast: true }),
  });
  if (!res.ok) {
    throw new Error(`Create failed: ${res.status} ${await res.text()}`);
  }
  return normalizeAdmin(await res.json());
}

export async function deleteProduct(id) {
  const res = await fetch(`${catalogUrl()}/${id}`, {
    method: 'DELETE',
    headers: catalogHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Delete failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}
