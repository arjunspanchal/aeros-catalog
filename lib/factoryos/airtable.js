// Backward-compatible "Airtable" client over Supabase. The function shapes
// (airtableList / airtableGet / airtableCreate / airtableUpdate /
// airtableDelete / airtableUploadAttachment) are preserved so the legacy
// callers in repo.js + the FactoryOS API routes don't need to change.
//
// Underneath, every call routes through lib/db/airtableShim.js which talks
// to Supabase exclusively. Airtable record IDs (recXXX) and Postgres UUIDs
// are both accepted as `id` arguments — old URLs/cookies keep resolving.

export { airtableList, airtableGet, airtableCreate, airtableUpdate, airtableDelete, airtableUploadAttachment } from "../db/airtableShim.js";

// FactoryOS table names — kept as constants so callers don't string-literal them.
export const TABLES = {
  clients:        () => "Clients",
  users:          () => "Users",
  jobs:           () => "Jobs",
  updates:        () => "Job Status Updates",
  otp:            () => "OTP Codes",
  customerPOs:    () => "Customer POs",
  rawMaterials:   () => "RM Inventory",
  rmReceipts:     () => "RM Receipts",
  machines:       () => "Machines",
  productionRuns: () => "Production Runs",
  rmConsumption:  () => "RM Consumption",
  employees:      () => "Employees",
  attendance:     () => "Attendance",
  coatingJobs:    () => "Coating Jobs",
  vendors:        () => "Vendors",
};

// Used by repo.js when building filterByFormula strings. Now mostly a no-op
// — the airtableShim translator only needs to recognise canonical patterns,
// and PostgREST quoting is different — but keeping the export so the imports
// in repo.js still resolve.
export function escapeFormula(v) {
  return String(v).replace(/'/g, "\\'");
}
