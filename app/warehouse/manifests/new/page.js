import { redirect } from "next/navigation";
import { getSession } from "@/lib/hub/session";
import { canManageManifests, createManifest } from "@/lib/warehouse/manifestGenerator";

export const dynamic = "force-dynamic";

export const metadata = { title: "New manifest — WarehouseOS" };

// There's no "new manifest" form to fill in: the whole point of the lean
// generator is to land straight in the builder. This creates the header with
// today's date and redirects, so the first thing the team sees is the invoice
// and box-type rows. Vehicle and reference are edited inline there.
export default async function NewManifestPage() {
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

  const manifest = await createManifest({}, session?.email);
  redirect(`/warehouse/manifests/${manifest.id}`);
}
