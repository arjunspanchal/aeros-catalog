// Shared constants for the Orders module. Keep in sync with Airtable single-select options.

export const STAGES = [
  "RM Pending",
  "Under Printing",
  "In Conversion",
  "Packing",
  "Ready for Dispatch",
  "Dispatched",
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

export function canUpdateStage(role) {
  return role === ROLES.ADMIN || role === ROLES.ACCOUNT_MANAGER || role === ROLES.FACTORY_MANAGER;
}

export function isInternalRole(role) {
  return role === ROLES.ADMIN || role === ROLES.ACCOUNT_MANAGER || role === ROLES.FACTORY_MANAGER;
}
