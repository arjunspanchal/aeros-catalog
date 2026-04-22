import { redirect } from "next/navigation";
import { getRateCardSession } from "@/lib/rate-cards/auth";
import { listCards } from "@/lib/rate-cards/store";
import RateCardsList from "./_components/RateCardsList";

export const dynamic = "force-dynamic";

export default async function RateCardsHomePage() {
  const session = getRateCardSession();
  if (!session) redirect("/login");

  const isAdmin = session.rateCardRole === "admin";
  const cards = await listCards(isAdmin ? {} : { clientEmail: session.email });

  return (
    <div className="max-w-5xl mx-auto px-4 pb-10 pt-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-1 dark:text-white">
        {isAdmin ? "Rate Cards" : "Your Rate Cards"}
      </h1>
      <p className="text-sm text-gray-500 mb-6 dark:text-gray-400">
        {isAdmin
          ? "Master pricing sheets per customer. Prices on cup-formula items track the current paper rates automatically."
          : "Your agreed rates per SKU. Prices stay stable unless paper raw-material rates move."}
      </p>
      <RateCardsList cards={cards} isAdmin={isAdmin} />
    </div>
  );
}
