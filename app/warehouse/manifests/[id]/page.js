import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/hub/session";
import { canManageManifests, getManifest } from "@/lib/warehouse/manifestGenerator";
import { listDispatchClients, VEHICLE_SIZES } from "@/lib/warehouse/vehicleDispatches";
import {
  listBoxTypes,
  listGeneratorLines,
  listManifestInvoices,
  listBoxTypeHistory,
} from "@/lib/warehouse/dispatchManifest";
import ManifestBuilderClient from "./ManifestBuilderClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const m = await getManifest(params.id).catch(() => null);
  return { title: `${m?.manifest_no || "Manifest"} — WarehouseOS` };
}

export default async function ManifestBuilderPage({ params }) {
  const session = getSession();
  if (!session) redirect("/login");
  if (!canManageManifests(session)) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-800">
          <p className="text-lg font-semibold">Access denied</p>
        </div>
      </div>
    );
  }

  const manifest = await getManifest(params.id);
  if (!manifest) notFound();

  // None of these are load-bearing for the header, so a failure opens the
  // builder with an empty picker rather than 500-ing the page.
  const [boxTypes, lines, invoices, clients, history] = await Promise.all([
    listBoxTypes().catch(() => []),
    listGeneratorLines(params.id).catch(() => []),
    listManifestInvoices(params.id).catch(() => []),
    listDispatchClients().catch(() => []),
    listBoxTypeHistory({}).catch(() => []),
  ]);

  return (
    <ManifestBuilderClient
      manifest={manifest}
      boxTypes={boxTypes}
      initialLines={lines}
      initialInvoices={invoices}
      clients={clients}
      history={history}
      vehicleSizes={VEHICLE_SIZES}
      isAdmin={!!session.isAdmin}
    />
  );
}
