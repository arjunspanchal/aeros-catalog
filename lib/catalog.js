// Server-side helper for the fresh product catalog.
// Reads from a separate Airtable base — CATALOG_BASE_ID / CATALOG_TABLE_ID.

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

export async function fetchCatalog() {
  const token = required('AIRTABLE_TOKEN');
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
