import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getRateCardSession } from "@/lib/rate-cards/auth";
import { getCard, listItems } from "@/lib/rate-cards/store";
import { priceAll } from "@/lib/rate-cards/pricing";
import RateCardView from "../_components/RateCardView";

export const dynamic = "force-dynamic";

export default async function RateCardDetailPage({ params }) {
  const session = getRateCardSession();
  if (!session) redirect("/login");

  const card = await getCard(params.id);
  if (!card) notFound();

  if (session.rateCardRole !== "admin" && card.clientEmail !== session.email) {
    // Don't leak existence of other clients' cards.
    notFound();
  }

  const items = await listItems(card.ref);
  const priced = priceAll(items);
  const isAdmin = session.rateCardRole === "admin";

  return (
    <div className="max-w-5xl mx-auto px-4 pb-10 pt-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <Link href="/rate-cards" className="hover:text-blue-600 dark:hover:text-blue-400">Rate Cards</Link>
            {" · "}{card.ref}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {card.title || card.brand || card.ref}
          </h1>
          <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">
            {card.brand && <span>Brand: <strong>{card.brand}</strong> · </span>}
            {isAdmin && card.clientEmail && <span>Client: <strong>{card.clientName || card.clientEmail}</strong> · </span>}
            Status: <strong>{card.status || "Draft"}</strong>
          </p>
        </div>
        {isAdmin && (
          <Link
            href={`/rate-cards/admin/${card.id}/edit`}
            className="shrink-0 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
          >
            Edit
          </Link>
        )}
      </div>

      <RateCardView items={priced} />

      {card.terms && (
        <div className="mt-6 text-sm text-gray-600 whitespace-pre-wrap dark:text-gray-300">
          <h2 className="text-sm font-semibold text-gray-700 mb-2 dark:text-gray-200">Terms & notes</h2>
          {card.terms}
        </div>
      )}
    </div>
  );
}
