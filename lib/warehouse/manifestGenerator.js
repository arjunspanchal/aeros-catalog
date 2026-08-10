// WarehouseOS — standalone Dispatch Manifest generator.
//
// A manifest built on its own, not hung off a vehicle-dispatch freight log:
// the team assembles what's going on a truck — invoices (each to its own
// consignee), box types, weight and CBM — without first having to name a
// single customer for the trip. That single-customer requirement on a
// dispatch is exactly what blocked multi-customer vehicles.
//
// The invoices and lines are the SAME tables the dispatch manifest uses,
// keyed here by manifest_id instead of dispatch_id (see dispatchManifest.js).
// This module owns only the manifest header + its list.

import { dbSelect, dbInsert, dbUpdate } from "../db/supabase.js";
import { listGeneratorLines, manifestTotals } from "./dispatchManifest.js";

// Same staff set as the dispatch log — AMs raise them, warehouse works them.
export { canManageVehicleDispatch as canManageManifests } from "./vehicleDispatches.js";

const SELECT =
  "id,manifest_no,manifest_date,reference,vehicle_size,vehicle_number," +
  "notes,created_at,updated_at,created_by";

export async function getManifest(id) {
  const rows = await dbSelect("dispatch_manifests", {
    select: SELECT,
    filter: { id: `eq.${id}`, deleted_at: "is.null" },
    limit: 1,
  });
  return rows[0] || null;
}

// The generated-manifest list, with totals rolled up in Postgres.
export async function listManifests({ limit = 1000 } = {}) {
  const rows = await dbSelect("v_dispatch_manifests", {
    select: "*",
    order: "manifest_date.desc,manifest_no.desc",
    limit,
  });
  return rows.map((r) => ({
    ...r,
    line_count: Number(r.line_count) || 0,
    invoice_count: Number(r.invoice_count) || 0,
    total_boxes: Number(r.total_boxes) || 0,
    total_pcs: Number(r.total_pcs) || 0,
    total_kg: Number(r.total_kg) || 0,
    total_cbm: Number(r.total_cbm) || 0,
    missing_kg: Number(r.missing_kg) || 0,
    missing_cbm: Number(r.missing_cbm) || 0,
    unassigned_lines: Number(r.unassigned_lines) || 0,
  }));
}

function headerPayload(p) {
  return {
    manifest_date: p.manifest_date || new Date().toISOString().slice(0, 10),
    reference: p.reference?.trim() || null,
    vehicle_size: p.vehicle_size?.trim() || null,
    vehicle_number: p.vehicle_number?.trim() || null,
    notes: p.notes?.trim() || null,
  };
}

export async function createManifest(payload, userEmail) {
  const row = await dbInsert("dispatch_manifests", {
    ...headerPayload(payload),
    created_by: userEmail || null,
  });
  return getManifest(row.id);
}

export async function updateManifest(id, payload) {
  await dbUpdate("dispatch_manifests", "id", id, headerPayload(payload));
  return getManifest(id);
}

export async function softDeleteManifest(id) {
  await dbUpdate("dispatch_manifests", "id", id, { deleted_at: new Date().toISOString() });
}

// Convenience for the print/detail pages: header + its rolled-up totals.
export async function getManifestWithTotals(id) {
  const manifest = await getManifest(id);
  if (!manifest) return null;
  const lines = await listGeneratorLines(id);
  return { manifest, lines, totals: manifestTotals(lines) };
}
