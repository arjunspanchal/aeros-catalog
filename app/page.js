import { fetchInventory, getCategories } from '@/lib/airtable';
import Header from './components/Header';
import Catalog from './components/Catalog';
import Footer from './components/Footer';

// Revalidate every 60 seconds — Airtable updates will appear within a minute
export const revalidate = 60;

export default async function HomePage() {
  let items = [];
  let error = null;

  try {
    items = await fetchInventory();
  } catch (e) {
    error = e.message;
  }

  const categories = getCategories(items);

  return (
    <>
      <Header itemCount={items.length} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
            <p className="font-semibold">Could not load inventory.</p>
            <p className="mt-1 text-sm">{error}</p>
            <p className="mt-2 text-xs">
              Check that AIRTABLE_TOKEN, AIRTABLE_BASE_ID, and AIRTABLE_TABLE_ID are set
              in your Vercel environment variables.
            </p>
          </div>
        ) : (
          <Catalog items={items} categories={categories} />
        )}
      </main>
      <Footer />
    </>
  );
}
