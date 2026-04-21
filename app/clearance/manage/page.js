import { redirect } from "next/navigation";
import { getSession } from "@/lib/hub/session";
import { canManageClearance, listItemsAdmin } from "@/lib/clearance/admin";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import ManageClient from "./ManageClient";

// No caching — admins need to see fresh data after every edit.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Manage Clearance Stock — Aeros",
  description: "Backend for editing clearance stock items and photos.",
};

export default async function ManagePage() {
  const session = getSession();
  if (!session) redirect("/login");
  if (!canManageClearance(session)) {
    return (
      <>
        <Header activeNav="clearance" />
        <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-800">
            <p className="font-semibold text-lg">Access denied</p>
            <p className="mt-2 text-sm">
              The Clearance Stock backend is restricted to Admin, Factory
              Manager, and Factory Executive roles.
            </p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  let items = [];
  let error = null;
  try {
    items = await listItemsAdmin();
  } catch (e) {
    error = e.message;
  }

  return (
    <>
      <Header
        title="Manage Clearance Stock"
        subtitle="Edit items and upload photos. Changes reflect on the public page within 60 seconds."
        itemCount={items.length}
        itemLabel="items"
        activeNav="clearance"
      />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
            <p className="font-semibold">Could not load items.</p>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        ) : (
          <ManageClient initialItems={items} />
        )}
      </main>
      <Footer />
    </>
  );
}
