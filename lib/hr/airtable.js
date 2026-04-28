// Stub for the HR PAT — placeholder for the 1.3 migration that moves HR
// tables (Employees, Attendance) out of the Orders base into a dedicated
// HR base behind AIRTABLE_PAT_HR.
//
// No code path should import from this file yet. Until 1.3 lands, HR data
// lives in the Orders base and HR functions go through lib/factoryos/repo.js,
// which routes through AIRTABLE_PAT_ORDERS.
//
// Every export here throws on call rather than returning undefined, so a
// future import that gets wired up before the migration completes fails
// loudly instead of silently corrupting state.

function notProvisioned() {
  throw new Error(
    "HR base not provisioned — see docs/hr-migration-plan.md. " +
    "Until 1.3 lands, HR data lives in the Orders base; " +
    "use lib/factoryos/repo.js (employees, attendance) instead."
  );
}

export const airtableList = notProvisioned;
export const airtableGet = notProvisioned;
export const airtableCreate = notProvisioned;
export const airtableUpdate = notProvisioned;
export const airtableDelete = notProvisioned;
export const airtableUploadAttachment = notProvisioned;

export const TABLES = {
  employees: notProvisioned,
  attendance: notProvisioned,
};

export function escapeFormula() {
  notProvisioned();
}
