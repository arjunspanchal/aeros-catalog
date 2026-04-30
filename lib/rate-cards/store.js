// Rate Cards persistence. Lives in the calc base alongside `Quotes` / `Clients`
// / `Bag Specs`; clients are referenced by email string (same pattern as
// `Quotes`) so we don't need a cross-base link.

import {
  airtableList, airtableCreate, airtableUpdate, airtableDelete,
  escapeFormula,
} from "../calc/airtable.js";

export const TABLES = {
  cards: () => process.env.AIRTABLE_RATE_CARDS_TABLE || "Rate Cards",
  items: () => process.env.AIRTABLE_RATE_CARD_ITEMS_TABLE || "Rate Card Items",
};

// --- Rate Cards (header) -------------------------------------------------

function recordToCard(r) {
  const f = r.fields || {};
  return {
    id: r.id,
    ref: f.Ref || "",
    title: f.Title || "",
    clientEmail: (f["Client Email"] || "").toLowerCase(),
    clientName: f["Client Name"] || "",
    brand: f.Brand || "",
    status: f.Status || "Draft",
    terms: f.Terms || "",
    created: f.Created || r.createdTime || "",
    updated: f.Updated || "",
  };
}

export async function listCards({ clientEmail } = {}) {
  const opts = { sort: [{ field: "Created", direction: "desc" }] };
  if (clientEmail) {
    opts.filterByFormula = `LOWER({Client Email})='${escapeFormula(clientEmail.toLowerCase())}'`;
  }
  const rows = await airtableList(TABLES.cards(), opts);
  return rows.map(recordToCard);
}

export async function getCard(id) {
  const rows = await airtableList(TABLES.cards(), {
    filterByFormula: `RECORD_ID()='${id}'`,
    maxRecords: 1,
  });
  return rows[0] ? recordToCard(rows[0]) : null;
}

export async function createCard(input) {
  const fields = {
    Ref: input.ref,
    Title: input.title || "",
    "Client Email": (input.clientEmail || "").toLowerCase(),
    "Client Name": input.clientName || "",
    Brand: input.brand || "",
    Status: input.status || "Draft",
    Terms: input.terms || "",
    Created: new Date().toISOString(),
  };
  Object.keys(fields).forEach((k) => (fields[k] === undefined || fields[k] === "") && delete fields[k]);
  // Keep Ref + Client Email even if blank so Airtable surfaces the validation
  // error if someone somehow sends an empty one:
  fields.Ref = input.ref;
  fields["Client Email"] = (input.clientEmail || "").toLowerCase();
  const row = await airtableCreate(TABLES.cards(), fields);
  return recordToCard(row);
}

export async function updateCard(id, input) {
  const fields = {};
  if (input.title !== undefined) fields.Title = input.title || "";
  if (input.clientEmail !== undefined) fields["Client Email"] = (input.clientEmail || "").toLowerCase();
  if (input.clientName !== undefined) fields["Client Name"] = input.clientName || "";
  if (input.brand !== undefined) fields.Brand = input.brand || "";
  if (input.status !== undefined) fields.Status = input.status || "Draft";
  if (input.terms !== undefined) fields.Terms = input.terms || "";
  fields.Updated = new Date().toISOString();
  const row = await airtableUpdate(TABLES.cards(), id, fields);
  return recordToCard(row);
}

export async function deleteCard(id) {
  // Best-effort cascade: remove items that point at this card so Airtable
  // doesn't leak orphans. Failures are non-fatal (user can clean up in UI).
  const card = await getCard(id);
  if (card?.ref) {
    const items = await listItems(card.ref);
    await Promise.allSettled(items.map((it) => airtableDelete(TABLES.items(), it.id)));
  }
  await airtableDelete(TABLES.cards(), id);
  return { ok: true };
}

// --- Rate Card Items ----------------------------------------------------

function parseJSON(raw, fallback) {
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

function recordToItem(r) {
  const f = r.fields || {};
  return {
    id: r.id,
    cardId: Array.isArray(f["Rate Card"]) && f["Rate Card"].length ? f["Rate Card"][0] : null,
    cardRef: f["Rate Card Ref"] || "",
    section: f.Section || "",
    sortOrder: typeof f["Sort Order"] === "number" ? f["Sort Order"] : 0,
    // Master product reference — admin picks from the Aeros Products Master
    // (catalog base). We snapshot the name/SKU so rate cards don't silently
    // change if the master is edited later; `productId` is the live pointer.
    productId: f["Product Id"] || "",
    productSku: f["Product SKU"] || "",
    productName: f["Product Name"] || "",
    // Item-level overlays on top of the master product.
    brand: f.Brand || "",
    printing: f.Printing || "",
    material: f.Material || "",
    dimension: f.Dimension || "",
    cartonSize: f["Carton Size"] || "",
    casePack: f["Case Pack"] ?? null,
    moq: f.MOQ || "",
    pricingMode: f["Pricing Mode"] || "fixed",
    cupSpec: parseJSON(f["Cup Spec"], null),
    tierQtys: parseJSON(f["Tier Qtys"], []),
    fixedRates: parseJSON(f["Fixed Rates"], []),
    notes: f.Notes || "",
  };
}

// Items are filtered by the duplicated `Rate Card Ref` text column — simpler
// and more reliable than trying to filterByFormula on a linked-record array.
export async function listItems(cardRef) {
  if (!cardRef) return [];
  const rows = await airtableList(TABLES.items(), {
    filterByFormula: `{Rate Card Ref}='${escapeFormula(cardRef)}'`,
    sort: [{ field: "Sort Order", direction: "asc" }],
  });
  return rows.map(recordToItem);
}

export async function createItem({ cardId, cardRef }, input) {
  const fields = {
    "Rate Card": cardId ? [cardId] : undefined,
    "Rate Card Ref": cardRef || "",
    Section: input.section || "",
    "Sort Order": typeof input.sortOrder === "number" ? input.sortOrder : 0,
    "Product Id": input.productId || "",
    "Product SKU": input.productSku || "",
    "Product Name": input.productName || "",
    Brand: input.brand || "",
    Printing: input.printing || "",
    Material: input.material || "",
    Dimension: input.dimension || "",
    "Carton Size": input.cartonSize || "",
    "Case Pack": input.casePack ? Number(input.casePack) : undefined,
    MOQ: input.moq || "",
    "Pricing Mode": input.pricingMode || "fixed",
    "Cup Spec": input.cupSpec ? JSON.stringify(input.cupSpec) : "",
    "Tier Qtys": input.tierQtys ? JSON.stringify(input.tierQtys) : "[]",
    "Fixed Rates": input.fixedRates ? JSON.stringify(input.fixedRates) : "[]",
    Notes: input.notes || "",
  };
  Object.keys(fields).forEach((k) => fields[k] === undefined && delete fields[k]);
  const row = await airtableCreate(TABLES.items(), fields);
  return recordToItem(row);
}

export async function updateItem(id, input) {
  const fields = {};
  if (input.section !== undefined) fields.Section = input.section || "";
  if (input.sortOrder !== undefined) fields["Sort Order"] = Number(input.sortOrder) || 0;
  if (input.productId !== undefined) fields["Product Id"] = input.productId || "";
  if (input.productSku !== undefined) fields["Product SKU"] = input.productSku || "";
  if (input.productName !== undefined) fields["Product Name"] = input.productName || "";
  if (input.brand !== undefined) fields.Brand = input.brand || "";
  if (input.printing !== undefined) fields.Printing = input.printing || "";
  if (input.material !== undefined) fields.Material = input.material || "";
  if (input.dimension !== undefined) fields.Dimension = input.dimension || "";
  if (input.cartonSize !== undefined) fields["Carton Size"] = input.cartonSize || "";
  if (input.casePack !== undefined) fields["Case Pack"] = input.casePack ? Number(input.casePack) : null;
  if (input.moq !== undefined) fields.MOQ = input.moq || "";
  if (input.pricingMode !== undefined) fields["Pricing Mode"] = input.pricingMode || "fixed";
  if (input.cupSpec !== undefined) fields["Cup Spec"] = input.cupSpec ? JSON.stringify(input.cupSpec) : "";
  if (input.tierQtys !== undefined) fields["Tier Qtys"] = JSON.stringify(input.tierQtys || []);
  if (input.fixedRates !== undefined) fields["Fixed Rates"] = JSON.stringify(input.fixedRates || []);
  if (input.notes !== undefined) fields.Notes = input.notes || "";
  const row = await airtableUpdate(TABLES.items(), id, fields);
  return recordToItem(row);
}

export async function deleteItem(id) {
  await airtableDelete(TABLES.items(), id);
  return { ok: true };
}
