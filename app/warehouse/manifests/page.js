import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/hub/session";
import { canManageManifests, listManifests } from "@/lib/warehouse/manifestGenerator";
import ManifestListClient from "./ManifestListClient";

export const dynamic = "force-dynamic";

export const metadata = { title: "Manifest generator — WarehouseOS" };

export default async function ManifestsPage() {
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

  let manifests = [], error = null;
  try {
    manifests = await listManifests({ limit: 1000 });
  } catch (e) {
    error = e.message;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Manifest generator</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Build a loading manifest for a vehicle — invoices, box counts, total weight and CBM —
            for one customer or several on the same truck. Not tied to a dispatch.
          </p>
        </div>
        <Link
          href="/warehouse/manifests/new"
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
        >
          + New manifest
        </Link>
      </div>
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>
      ) : (
        <ManifestListClient manifests={manifests} />
      )}
    </div>
  );
}
