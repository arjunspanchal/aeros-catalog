// Logistics calculator — server-side data access (service-role REST helpers).
// Rates come from the Delhivery Addendum tables; persistence covers vendor
// origin pincodes, saved delivery addresses and the quote log.

import { dbSelect, dbInsert, dbUpdate } from "../db/supabase.js";
import { ROLES } from "../factoryos/constants.js";

// Internal staff only — freight cost structure is not for customer logins.
export function canUseLogistics(session) {
  if (!session) return false;
  if (session.isAdmin) return true;
  const f = session.modules?.factoryos;
  if ([ROLES.ADMIN, ROLES.ACCOUNT_MANAGER, ROLES.FACTORY_MANAGER, ROLES.FACTORY_EXECUTIVE].includes(f)) return true;
  return session.modules?.calculator === "admin";
}

export async function loadBootstrap() {
  const [config, zoneMatrix, laneRates, zoneMap, vendors, addresses, products] = await Promise.all([
    dbSelect("pricing_config", { limit: 1 }),
    dbSelect("delhivery_zone_rates", { select: "origin_zone,dest_zone,rate_per_kg" }),
    dbSelect("delhivery_lane_rates", { select: "origin_zone,dest_name,rate_per_kg" }),
    dbSelect("delhivery_zone_map", { select: "state,zone,status" }),
    dbSelect("vendors", {
      select: "id,name,type,pincode",
      filter: { active: "eq.true" },
      order: "name.asc",
    }),
    dbSelect("logistics_addresses", { order: "last_used_at.desc.nullslast,created_at.desc" }),
    // The ENTIRE catalogue, every category — items missing case-pack or
    // weight data are still quotable via manual overrides in the UI.
    dbSelect("master_products", {
      select: "id,sku,product_name,category,units_per_case,gross_weight_kg,volumetric_weight_kg,carton_dimensions",
      order: "category.asc,sku.asc",
      limit: 3000,
    }),
  ]);
  return {
    config: config[0] || {},
    zoneMatrix,
    laneRates,
    zoneMap,
    vendors,
    addresses,
    products,
  };
}

export async function saveVendorPincode(vendorId, pincode) {
  return dbUpdate("vendors", "id", vendorId, { pincode });
}

export async function createAddress(payload) {
  const clean = {
    label: String(payload.label || "").trim(),
    contact_name: payload.contact_name || null,
    phone: payload.phone || null,
    address_line: payload.address_line || null,
    city: payload.city || null,
    state: payload.state || null,
    pincode: String(payload.pincode || "").trim(),
    is_oda: !!payload.is_oda,
    notes: payload.notes || null,
  };
  if (!clean.label) throw new Error("Address label is required");
  if (!/^\d{6}$/.test(clean.pincode)) throw new Error("Pincode must be 6 digits");
  return dbInsert("logistics_addresses", clean);
}

export async function updateAddress(id, patch) {
  return dbUpdate("logistics_addresses", "id", id, patch);
}

export async function saveQuote(payload, session) {
  const row = await dbInsert("logistics_quotes", {
    ...payload,
    created_by: session?.email || session?.name || null,
  });
  if (payload.address_id) {
    await dbUpdate("logistics_addresses", "id", payload.address_id, {
      last_used_at: new Date().toISOString(),
    }).catch(() => {});
  }
  return row;
}
