// Unified user lookup. For Phase 1 we don't have a single Users table yet —
// entitlements are composed by checking the existing Calc Clients table and
// Orders Users table. Whichever tables the email appears in determine which
// modules they get access to. Catalogue + Clearance are granted to anyone
// who logs in successfully (viewer-only for now).
//
// This is deliberately a read-only composition. Phase 2 will introduce a
// dedicated Users/Identities table and migrate these existing rows into it.

import { airtableList as calcList, escapeFormula as calcEsc, TABLES as CALC_TABLES } from "@/lib/calc/airtable";
import { findUserByEmail as findOrdersUser } from "@/lib/orders/repo";

async function lookupCalcClient(email) {
  try {
    const [rec] = await calcList(CALC_TABLES.clients(), {
      filterByFormula: `LOWER({Email})='${calcEsc(email)}'`,
      maxRecords: 1,
    });
    if (!rec) return null;
    const f = rec.fields || {};
    const status = f.Status || "Active";
    if (status === "Blocked") return null;
    return {
      id: rec.id,
      email: (f.Email || "").toLowerCase(),
      name: f.Name || "",
      marginPct: f["Margin %"] !== undefined && f["Margin %"] !== null ? Number(f["Margin %"]) : null,
    };
  } catch {
    return null;
  }
}

// Build the unified entitlements payload for a known email. Returns null if
// the email isn't recognised in either source (and isn't the shared admin).
export async function resolveEntitlements(email) {
  const [calcClient, ordersUser] = await Promise.all([
    lookupCalcClient(email),
    findOrdersUser(email).catch(() => null),
  ]);

  const recognized = !!calcClient || !!(ordersUser && ordersUser.active);
  if (!recognized) return null;

  const modules = {
    calculator: calcClient ? "client" : null,
    orders: ordersUser && ordersUser.active ? ordersUser.role : null,
    catalogue: "viewer",
    clearance: "viewer",
  };

  const name =
    ordersUser?.name ||
    calcClient?.name ||
    email.split("@")[0];

  return {
    email,
    name,
    isAdmin: false,
    modules,
    // Module-specific extras that the calc / orders cookies need to carry.
    calcMarginPct: calcClient?.marginPct ?? null,
    ordersUserId: ordersUser?.id ?? null,
    ordersClientIds: ordersUser?.clientIds ?? [],
  };
}

// Build the admin entitlements payload — granted by the shared admin password.
// No email/Users lookup required; admin gets everything.
export function adminEntitlements() {
  return {
    email: null,
    name: "Admin",
    isAdmin: true,
    modules: {
      calculator: "admin",
      orders: "admin",
      catalogue: "viewer",
      clearance: "viewer",
    },
    calcMarginPct: null,
    ordersUserId: null,
    ordersClientIds: [],
  };
}
