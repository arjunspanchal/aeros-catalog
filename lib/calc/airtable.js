// Backward-compatible Calculator-base client over Supabase. Same surface as
// the legacy Airtable wrapper; underneath everything is Supabase via
// lib/db/airtableShim.js.

export { airtableList, airtableCreate, airtableUpdate, airtableDelete } from "../db/airtableShim.js";

export const TABLES = {
  bagSpecs: () => "Bag Specs",
  quotes: () => "Quotes",
  boxQuotes: () => "Box Quotes",
  cupQuotes: () => "Cup Quotes",
  ppQuotes: () => "PP Quotes",
  importQuotes: () => "Import Quotes",
  clients: () => "Clients", // legacy — calc clients now live in unified Users table
  otp: () => "OTP Codes",
};

export function escapeFormula(v) {
  return String(v).replace(/'/g, "\\'");
}
