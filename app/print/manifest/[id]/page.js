import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/hub/session";
import { canManageManifests, getManifest } from "@/lib/warehouse/manifestGenerator";
import { suggestVehicle } from "@/lib/warehouse/vehicleCapacity";
import {
  listGeneratorLines,
  listManifestInvoices,
  manifestTotals,
  groupByInvoice,
} from "@/lib/warehouse/dispatchManifest";
import PrintView from "./PrintView";

export const dynamic = "force-dynamic";

export const metadata = { title: "Print — dispatch manifest" };

export default async function ManifestPrintPage({ params }) {
  const session = getSession();
  if (!session) redirect("/login");
  if (!canManageManifests(session)) {
    return <div className="p-12 text-center text-red-700">Access denied</div>;
  }

  const manifest = await getManifest(params.id);
  if (!manifest) notFound();

  const [lines, invoices] = await Promise.all([
    listGeneratorLines(params.id),
    listManifestInvoices(params.id),
  ]);
  const totals = manifestTotals(lines);
  const groups = groupByInvoice(lines, invoices);
  // Only worth printing when no vehicle has been committed yet — once one is
  // booked, the manifest should show what's actually coming, not a suggestion.
  const suggestion = manifest.vehicle_size ? null : suggestVehicle(totals.cbm, totals.kg);

  return (
    <PrintView
      manifest={manifest}
      groups={groups}
      invoices={invoices}
      totals={totals}
      suggestion={suggestion}
    />
  );
}
