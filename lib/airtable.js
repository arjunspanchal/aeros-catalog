// Server-side Airtable fetch helper.
// Reads all records from the configured base/table/view using the REST API.

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

/**
 * Fetch every record from the Aeros Clearance Stock Inventory table.
 * Handles pagination (Airtable returns 100 records per page).
 */
export async function fetchInventory() {
  const token = required('AIRTABLE_TOKEN');
  const baseId = required('AIRTABLE_BASE_ID');
  const tableId = required('AIRTABLE_TABLE_ID');
  const view = process.env.AIRTABLE_VIEW || undefined;

  const records = [];
  let offset;

  do {
    const params = new URLSearchParams();
    params.set('pageSize', '100');
    if (view) params.set('view', view);
    if (offset) params.set('offset', offset);

    const url = `${AIRTABLE_API}/${baseId}/${tableId}?${params.toString()}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      // ISR: refetch from Airtable every 60 seconds in production
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `Airtable API error ${res.status}: ${body.slice(0, 300)}`
      );
    }

    const data = await res.json();
    records.push(...(data.records || []));
    offset = data.offset;
  } while (offset);

  const normalized = records.map(normalizeRecord).filter(Boolean);

  // Filter: plain goods only — exclude known branded lines
  const BRANDED = new Set(['Chuk']);
  const plainOnly = normalized.filter((item) => !BRANDED.has(item.brand));

  // Visibility rule: a row is only public once staff have set a Price.
  // Without a Price, the row is treated as a draft / internal entry — no leak.
  // The `Show Price` toggle is orthogonal: it controls whether the rate is
  // RENDERED on the card, not whether the card appears at all.
  const priced = plainOnly.filter((item) => item.price != null);

  // Deduplicate: merge records with the same item name, summing stock quantities
  return deduplicateByName(priced);
}

/**
 * Merge records that share the same item name.
 * Stock quantities are summed; the first record's photo/fields are kept.
 */
function deduplicateByName(items) {
  const map = new Map();
  for (const item of items) {
    const key = item.itemName.trim().toLowerCase();
    if (!map.has(key)) {
      map.set(key, { ...item });
    } else {
      const existing = map.get(key);
      // Sum stock quantities (treat null as 0 for addition, but keep null if both are null)
      if (item.stockQuantity !== null || existing.stockQuantity !== null) {
        existing.stockQuantity =
          (existing.stockQuantity ?? 0) + (item.stockQuantity ?? 0);
      }
      // Use photo from duplicate if primary has none
      if (!existing.photoUrl && item.photoUrl) {
        existing.photoUrl = item.photoUrl;
      }
      // Price: prefer the first non-null we saw. Mixing dupes with different
      // prices is a data bug for a merge-by-name view — keeping the first is
      // the least surprising choice.
      if (existing.price == null && item.price != null) {
        existing.price = item.price;
      }
      // Show Price: ORed across dupes — if any instance wants the price shown,
      // show it.
      if (item.showPrice) existing.showPrice = true;
    }
  }
  // Rebuild WhatsApp/Email URLs with merged stock quantities
  return Array.from(map.values()).map((item) => {
    item.whatsappUrl = buildWhatsAppUrl(item);
    item.emailUrl = buildEmailUrl(item);
    return item;
  });
}

const WHATSAPP_NUMBER = '917977007497';
const EMAIL_ADDRESS = 'clearance@aeros-x.com';

function buildWhatsAppUrl(item) {
  const msg = `Hi, I'm interested in this item from Aeros Clearance Stock — Item: ${item.itemName} — Brand: ${item.brand} — Category: ${item.category} — Stock available: ${item.stockQuantity ?? 'TBC'} ${item.unit} — Could you share more details and pricing?`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

function buildEmailUrl(item) {
  const subject = `Inquiry: ${item.itemName}`;
  const body = `Hi, I'm interested in this item from your clearance stock — Item: ${item.itemName} — Brand: ${item.brand} — Category: ${item.category} — Stock available: ${item.stockQuantity ?? 'TBC'} ${item.unit} — Please share more details and pricing. Thanks`;
  return `mailto:${EMAIL_ADDRESS}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Normalize an Airtable record into the shape the UI needs.
 * Returns null for records that are missing required fields.
 * WhatsApp/Email URLs are generated in code — no formula fields needed.
 */
function normalizeRecord(record) {
  const f = record.fields || {};

  const itemName = f['Item Name'];
  if (!itemName) return null;

  const photos = Array.isArray(f['Photos']) ? f['Photos'] : [];
  const firstPhoto = photos[0];

  const item = {
    id: record.id,
    itemName,
    brand: f['Brand'] || '',
    category: f['Category'] || 'Other',
    stockQuantity: typeof f['Stock Quantity'] === 'number' ? f['Stock Quantity'] : null,
    unit: f['Unit'] || 'pcs',
    casePack: typeof f['Case Pack'] === 'number' ? f['Case Pack'] : null,
    description: f['Description'] || '',
    specifications: f['Specifications'] || '',
    status: f['Status'] || 'Available',
    photoUrl: firstPhoto?.thumbnails?.large?.url || firstPhoto?.url || null,
    // Rate per unit. Only rendered on the public card when showPrice is true —
    // lets staff stage a price in Airtable before making it public.
    price: typeof f['Price'] === 'number' ? f['Price'] : null,
    showPrice: f['Show Price'] === true,
  };

  item.whatsappUrl = buildWhatsAppUrl(item);
  item.emailUrl = buildEmailUrl(item);

  return item;
}

/**
 * Extract a sorted unique list of categories from the records.
 */
export function getCategories(items) {
  const set = new Set();
  for (const item of items) {
    if (item.category) set.add(item.category);
  }
  return Array.from(set).sort();
}
