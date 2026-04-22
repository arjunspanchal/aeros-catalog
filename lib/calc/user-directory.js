// Reads/writes calculator client records against the unified Orders Users
// table (Phase 2 of the centralised-auth rollout). The Orders base holds the
// single source of truth for all Aeros users; rows with a non-empty
// `Calculator Role` are the calculator's "clients". Rows may also carry an
// Orders `Role`, Catalogue / Clearance access, etc.
//
// The legacy Calc base `Clients` table is no longer read or written here.
// It is preserved for historical reference but any new user-management goes
// through this helper against Orders Users.

import {
  airtableList, airtableCreate, airtableUpdate,
  escapeFormula, TABLES as ORDERS_TABLES,
} from "@/lib/factoryos/airtable";

const CALC_CLIENT_FILTER = `LOWER({Calculator Role})='client'`;

function toCalcClient(row) {
  const f = row.fields || {};
  const calcRole = f["Calculator Role"] || null;
  return {
    id: row.id,
    email: (f.Email || "").toLowerCase(),
    name: f.Name || "",
    company: f.Company || "",
    country: f.Country || "",
    marginPct: typeof f["Margin %"] === "number" ? f["Margin %"] : null,
    marginCupsPct: typeof f["Margin % Cups"] === "number" ? f["Margin % Cups"] : null,
    discountPct: typeof f["Discount %"] === "number" ? f["Discount %"] : 0,
    preferredCurrency: f["Preferred Currency"] || "INR",
    preferredUnit: f["Preferred Units"] || "mm",
    // Blocked = Calculator Role cleared; anything else shown as the set value.
    status: calcRole === "Client" ? "Active" : calcRole ? calcRole : "Blocked",
    calcRole,
    created: f.Created || row.createdTime || "",
    lastLogin: f["Last Login"] || "",
    notes: f.Notes || "",
    // Orders-side extras (not shown in the calc clients UI but present on the row).
    ordersRole: f.Role || null,
    active: f.Active !== false,
  };
}

export async function listCalcClients() {
  const rows = await airtableList(ORDERS_TABLES.users(), {
    filterByFormula: CALC_CLIENT_FILTER,
    sort: [{ field: "Created", direction: "desc" }],
  });
  return rows.map(toCalcClient);
}

export async function findCalcClientByEmail(email) {
  const rows = await airtableList(ORDERS_TABLES.users(), {
    filterByFormula: `AND(LOWER({Email})='${escapeFormula(email.toLowerCase())}', ${CALC_CLIENT_FILTER})`,
    maxRecords: 1,
  });
  return rows[0] ? toCalcClient(rows[0]) : null;
}

// Find ANY row matching this email (regardless of Calculator Role). Used when
// admin adds a "new" calc client who already exists as an Orders-only user —
// we upsert onto the same row instead of creating a duplicate.
export async function findAnyUserByEmail(email) {
  const rows = await airtableList(ORDERS_TABLES.users(), {
    filterByFormula: `LOWER({Email})='${escapeFormula(email.toLowerCase())}'`,
    maxRecords: 1,
  });
  return rows[0] || null;
}

function buildCalcFields({
  email, name, company, country, marginPct, marginCupsPct, discountPct,
  preferredCurrency, preferredUnit, status, notes,
}) {
  const fields = {};
  if (email !== undefined) fields.Email = email;
  if (name !== undefined) fields.Name = name || "";
  if (company !== undefined) fields.Company = company || "";
  if (country !== undefined) fields.Country = country || "";
  if (marginPct !== undefined) fields["Margin %"] = marginPct === null || marginPct === "" ? null : Number(marginPct);
  if (marginCupsPct !== undefined) fields["Margin % Cups"] = marginCupsPct === null || marginCupsPct === "" ? null : Number(marginCupsPct);
  if (discountPct !== undefined) fields["Discount %"] = discountPct === null || discountPct === "" ? 0 : Number(discountPct);
  if (preferredCurrency !== undefined) fields["Preferred Currency"] = preferredCurrency || "INR";
  if (preferredUnit !== undefined) fields["Preferred Units"] = preferredUnit || "mm";
  if (notes !== undefined) fields.Notes = notes || "";
  if (status !== undefined) {
    // Status Active → grant Calculator Role. Status Blocked → revoke it (row survives).
    fields["Calculator Role"] = status === "Blocked" ? null : "Client";
  }
  return fields;
}

export async function createCalcClient(input) {
  const existing = await findAnyUserByEmail(input.email);
  const fields = {
    ...buildCalcFields({ ...input, status: input.status || "Active" }),
    // Required for the user to log in via OTP:
    Active: true,
  };
  if (!fields["Calculator Role"]) fields["Calculator Role"] = "Client";
  if (existing) {
    const row = await airtableUpdate(ORDERS_TABLES.users(), existing.id, fields);
    return toCalcClient(row);
  }
  // New row needs a Created timestamp (Orders schema).
  fields.Created = new Date().toISOString();
  const row = await airtableCreate(ORDERS_TABLES.users(), fields);
  return toCalcClient(row);
}

export async function updateCalcClient(id, input) {
  const fields = buildCalcFields(input);
  const row = await airtableUpdate(ORDERS_TABLES.users(), id, fields);
  return toCalcClient(row);
}

// Soft-delete: drop Calculator Role so the row no longer appears as a calc
// client, but stays in place for any Orders-side history.
export async function revokeCalcClient(id) {
  await airtableUpdate(ORDERS_TABLES.users(), id, { "Calculator Role": null });
  return { ok: true };
}

// Lookup for runtime pricing (margin + discount). Returns nulls if the user
// either isn't a calc client or is Blocked.
export async function currentClientPricing(email, fallbackMargin) {
  const c = await findCalcClientByEmail(email);
  if (!c) return { marginPct: fallbackMargin, discountPct: 0 };
  return {
    marginPct: c.marginPct ?? fallbackMargin,
    discountPct: c.discountPct ?? 0,
  };
}

// Cup/tub margin lookup — uses the dedicated Margin % Cups field if set,
// else falls back to the bag Margin %, else to the provided default.
// Cups have no per-client discount right now (per product spec).
export async function currentClientCupPricing(email, fallbackMargin) {
  const c = await findCalcClientByEmail(email);
  if (!c) return { marginPct: fallbackMargin };
  return {
    marginPct: c.marginCupsPct ?? c.marginPct ?? fallbackMargin,
  };
}
