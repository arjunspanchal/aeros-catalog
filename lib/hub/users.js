// Unified user lookup. After Phase 2 migration, the Orders base `Users` table
// is the single source of truth. A row with `Calculator Role` set grants
// calculator access; a row with `Role` set grants orders access. Catalogue +
// Clearance are granted to anyone with either.

import { airtableList, escapeFormula, TABLES as ORDERS_TABLES } from "@/lib/factoryos/airtable";

function normalizeOrdersRole(raw) {
  if (!raw) return null;
  // Airtable returns the display name; orders module expects the internal
  // snake_case value (which is how we write it). Accept both forms.
  const s = String(raw).toLowerCase().replace(/\s+/g, "_");
  return s;
}

function normalizeCalcRole(raw) {
  if (!raw) return null;
  const s = String(raw).toLowerCase();
  if (s === "admin") return "admin";
  return "client";
}

export async function resolveEntitlements(email) {
  const rows = await airtableList(ORDERS_TABLES.users(), {
    filterByFormula: `LOWER({Email})='${escapeFormula(email.toLowerCase())}'`,
    maxRecords: 1,
  });
  const row = rows[0];
  if (!row) return null;
  const f = row.fields || {};
  if (f.Active === false) return null; // explicitly inactive

  const orders = normalizeOrdersRole(f.Role);
  // Account Managers (the role assigned as a job's "Customer Manager") need
  // calculator access to quote rates to clients. If no explicit Calculator
  // Role is set, default AMs to client-level calc + rate-cards.
  const calc = normalizeCalcRole(f["Calculator Role"]) || (orders === "account_manager" ? "client" : null);
  if (!calc && !orders) return null; // no module access

  return {
    email: (f.Email || email).toLowerCase(),
    name: f.Name || email.split("@")[0],
    isAdmin: false,
    modules: {
      calculator: calc,
      factoryos: orders,
      catalogue: "viewer",
      clearance: "viewer",
      // Rate cards ride on calc entitlement: admin edits, client reads.
      rate_cards: calc,
    },
    calcMarginPct: typeof f["Margin %"] === "number" ? f["Margin %"] : null,
    factoryosUserId: row.id,
    factoryosClientIds: Array.isArray(f.Client) ? f.Client : [],
  };
}

// Admin entitlements — granted by the shared ADMIN_PASSWORD. No Users row
// required; admin gets everything.
export function adminEntitlements() {
  return {
    email: null,
    name: "Admin",
    isAdmin: true,
    modules: {
      calculator: "admin",
      factoryos: "admin",
      catalogue: "viewer",
      clearance: "viewer",
      rate_cards: "admin",
    },
    calcMarginPct: null,
    factoryosUserId: null,
    factoryosClientIds: [],
  };
}
