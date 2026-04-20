import { getSession } from "@/lib/calc/session";
import { redirect } from "next/navigation";
import { NavBar } from "@/app/calculator/_components/NavBar";
import QuoteHistoryTable from "@/app/calculator/_components/QuoteHistoryTable";

export default function ClientQuotesPage() {
  const session = getSession();
  if (!session) redirect("/calculator/login");
  if (session.role !== "client") redirect("/calculator/admin");
  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar role="client" email={session.email} />
      <div className="max-w-5xl mx-auto px-4 pb-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">My Quotes</h1>
        <p className="text-sm text-gray-500 mb-6">All the rate quotes you&apos;ve saved.</p>
        <QuoteHistoryTable />
      </div>
    </div>
  );
}
