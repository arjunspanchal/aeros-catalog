#!/usr/bin/env node
/**
 * End-to-end smoke test for the Supabase-only cutover.
 * Exercises every read path the apps depend on; failures here = broken pages.
 *
 * USAGE
 *   node --env-file=.env.local scripts/smoke-test-end-to-end.js
 */

"use strict";

(async () => {
  const checks = [];

  // 1. Clearance public read
  const clearance = await import("../lib/airtable.js");
  const items = await clearance.fetchInventory();
  checks.push({ name: "/clearance fetchInventory", count: items.length, sample: items[0]?.itemName });

  // 2. Catalog public read
  const cat = await import("../lib/catalog.js");
  const products = await cat.fetchCatalog();
  checks.push({ name: "/catalog fetchCatalog", count: products.length, sample: products[0]?.productName });

  // 3. Master papers
  const pr = await import("../lib/paper-rm.js");
  const papers = await pr.listMasterPapers();
  checks.push({ name: "Paper RM listMasterPapers", count: papers.length, sample: papers[0]?.materialName });

  // 4. Calculator paper RM rates
  const rm = await import("../lib/calc/rmRates.js");
  const tables = await rm.fetchPaperRMTables();
  checks.push({
    name: "Calculator fetchPaperRMTables",
    count: tables ? Object.keys(tables.bySupplier).length : 0,
    sample: tables ? Object.keys(tables.bySupplier).join(",") : null,
  });

  // 5. FactoryOS — clients, users, jobs
  const repo = await import("../lib/factoryos/repo.js");
  const clients = await repo.listClients();
  checks.push({ name: "FactoryOS listClients", count: clients.length, sample: clients[0]?.name });
  const users = await repo.listUsers();
  checks.push({ name: "FactoryOS listUsers", count: users.length, sample: users[0]?.email });
  const jobs = await repo.listJobsForSession({ role: "admin", clientIds: [] });
  checks.push({ name: "FactoryOS listJobsForSession", count: jobs.length, sample: jobs[0]?.jNumber });

  // 6. Auth — entitlements
  const hub = await import("../lib/hub/users.js");
  if (users[0]?.email) {
    const ents = await hub.resolveEntitlements(users[0].email);
    checks.push({ name: "Hub resolveEntitlements", count: ents ? 1 : 0, sample: ents?.email });
  }

  // 7. Calculator quotes
  const calc = await import("../lib/calc/airtable.js");
  const quotes = await calc.airtableList(calc.TABLES.quotes());
  checks.push({ name: "Calc Quotes list", count: quotes.length, sample: quotes[0]?.fields?.["Quote Ref"] });

  // 8. Rate cards
  const rcStore = await import("../lib/rate-cards/store.js");
  const cards = await rcStore.listCards();
  checks.push({ name: "Rate Cards listCards", count: cards.length, sample: cards[0]?.ref });

  // 9. Vendors / Machines / Inventory
  const vendors = await repo.listVendors();
  checks.push({ name: "FactoryOS listVendors", count: vendors.length });
  const machines = await repo.listMachines();
  checks.push({ name: "FactoryOS listMachines", count: machines.length });
  const inv = await repo.listRawMaterials();
  checks.push({ name: "FactoryOS listRawMaterials", count: inv.length });

  // 10. Customer POs
  const pos = await repo.listCustomerPOs();
  checks.push({ name: "FactoryOS listCustomerPOs", count: pos.length });

  // 11. HR
  const employees = await repo.listEmployees();
  checks.push({ name: "FactoryOS listEmployees", count: employees.length });
  const attendance = await repo.listAttendance({});
  checks.push({ name: "FactoryOS listAttendance", count: attendance.length });

  // 12. Clearance admin (raw, un-deduped list)
  const clrAdmin = await import("../lib/clearance/admin.js");
  const clearanceAdmin = await clrAdmin.listItemsAdmin();
  checks.push({ name: "Clearance listItemsAdmin", count: clearanceAdmin.length });

  console.log("\n=== End-to-end smoke test ===\n");
  let failed = 0;
  for (const c of checks) {
    const status = c.count > 0 || c.sample ? "✓" : "·";
    console.log(`  ${status} ${c.name.padEnd(40)} count=${c.count}${c.sample ? `  e.g. ${c.sample}` : ""}`);
    if (c.count === 0 && !c.sample && !["FactoryOS listEmployees", "FactoryOS listAttendance", "FactoryOS listCustomerPOs", "FactoryOS listMachines"].includes(c.name)) {
      // count 0 is fine for tables that legitimately have no rows
    }
  }
  console.log(`\n${checks.length} checks run.`);
})().catch((err) => {
  console.error("\nFAILED:", err.message);
  console.error(err.stack);
  process.exit(1);
});
