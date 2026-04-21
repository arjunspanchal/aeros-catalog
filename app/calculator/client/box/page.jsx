import { getSession } from "@/lib/calc/session";
import { redirect } from "next/navigation";
import { NavBar } from "@/app/calculator/_components/NavBar";
import { listMasterPapers } from "@/lib/paper-rm";
import ClientBoxCalculator from "./ClientBoxCalculator";

export default async function ClientBoxPage() {
  const session = getSession();
  if (!session) redirect("/login");
  if (session.role !== "client") redirect("/calculator/admin/box");

  let papers = [];
  try { papers = await listMasterPapers(); } catch { /* Paper RM env may be unset — picker falls back to manual */ }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <NavBar role="client" email={session.email} />
      <div className="max-w-4xl mx-auto px-4 pb-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-1 dark:text-white">Custom Box Calculator</h1>
        <p className="text-sm text-gray-500 mb-6 dark:text-gray-400">Enter your box specs below. Rates shown are final, quoted per box.</p>
        <ClientBoxCalculator papers={papers} />
      </div>
    </div>
  );
}
