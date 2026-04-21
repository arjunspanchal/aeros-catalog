import { redirect, notFound } from "next/navigation";
import { getRateCardSession } from "@/lib/rate-cards/auth";
import { getCard, listItems } from "@/lib/rate-cards/store";
import EditRateCard from "./EditRateCard";

export const dynamic = "force-dynamic";

export default async function EditRateCardPage({ params }) {
  const session = getRateCardSession();
  if (!session) redirect("/login");
  if (session.rateCardRole !== "admin") redirect("/rate-cards");

  const card = await getCard(params.id);
  if (!card) notFound();
  const items = await listItems(card.ref);

  return (
    <div className="max-w-5xl mx-auto px-4 pb-10 pt-4">
      <EditRateCard initialCard={card} initialItems={items} />
    </div>
  );
}
