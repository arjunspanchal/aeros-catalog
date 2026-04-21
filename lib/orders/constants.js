// Shared constants for the Orders module. Keep in sync with Airtable single-select options.

export const STAGES = [
  "RM Pending",
  "Under Printing",
  "In Conversion",
  "Packing",
  "Ready for Dispatch",
  "Dispatched",
  "Delivered",
];

export const STAGE_INDEX = Object.fromEntries(STAGES.map((s, i) => [s, i]));

export const ROLES = {
  ADMIN: "admin",
  ACCOUNT_MANAGER: "account_manager",
  FACTORY_MANAGER: "factory_manager",
  CUSTOMER: "customer",
};

export const ROLE_OPTIONS = [
  { value: ROLES.ADMIN, label: "Admin" },
  { value: ROLES.ACCOUNT_MANAGER, label: "Account Manager" },
  { value: ROLES.FACTORY_MANAGER, label: "Factory Manager" },
  { value: ROLES.CUSTOMER, label: "Customer" },
];

export const CATEGORIES = ["Paper Bag", "Paper Cups", "Food Box", "Tub", "Other"];

// Factory machines. Consumption tracked in kgs, output in pcs (finished units).
// Partial rolls are normal — rolls count on RM Inventory stays fixed during
// a run; operators reconcile roll count when a roll is fully finished.
export const MACHINE_TYPES = [
  { value: "paper_bag", label: "Paper Bag Machine" },
  { value: "printer", label: "Printer" },
  { value: "die_cutter", label: "Die Cutter" },
  { value: "slotter", label: "Slotter" },
  { value: "lamination", label: "Lamination" },
  { value: "other", label: "Other" },
];

export const MACHINE_STATUSES = [
  { value: "active", label: "Active" },
  { value: "maintenance", label: "Maintenance" },
  { value: "retired", label: "Retired" },
];

export function canUpdateStage(role) {
  return role === ROLES.ADMIN || role === ROLES.ACCOUNT_MANAGER || role === ROLES.FACTORY_MANAGER;
}

export function isInternalRole(role) {
  return role === ROLES.ADMIN || role === ROLES.ACCOUNT_MANAGER || role === ROLES.FACTORY_MANAGER;
}
