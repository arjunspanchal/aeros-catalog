import { redirect } from "next/navigation";
import { getSession } from "@/lib/hub/session";
import { canManageCatalogue, listCatalogAdmin, getCatalogCategories } from "@/lib/catalog";
import AppHeader from "../../components/AppHeader";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import ManageClient from "./ManageClient";

// Admins need to see fresh data after every edit — skip the 5-minute
// revalidation that the public catalog uses.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Manage Product Catalogue — Aeros",
  description: "Backend for editing the Aeros product catalogue.",
};

export default async function CatalogManagePage() {
  const session = getSession();
  if (!session) redirect("/login");
  if (!canManageCatalogue(session)) {
    return (
      <>
        <AppHeader session={session} />
        <Header title="Manage Product Catalogue" subtitle="Staff backend — access restricted." />
        <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            <p className="font-semibold text-lg">Access denied</p>
            <p className="mt-2 text-sm">
              The Product Catalogue backend is restricted to Admin, Factory
              Manager, Factory Executive, and Account Manager roles.
            </p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  let products = [];
  let error = null;
  try {
    products = await listCatalogAdmin();
  } catch (e) {
    error = e.message;
  }

  const categories = getCatalogCategories(products);

  return (
    <>
      <AppHeader session={session} />
      <Header
        title="Manage Product Catalogue"
        subtitle="Edit product details. Changes reflect on the public catalogue within 5 minutes."
        itemCount={products.length}
        itemLabel="products"
      />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            <p className="font-semibold">Could not load products.</p>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        ) : (
          <ManageClient initialProducts={products} initialCategories={categories} />
        )}
      </main>
      <Footer />
    </>
  );
}
