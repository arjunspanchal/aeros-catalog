import { getSession } from "@/lib/calc/session";
import { redirect } from "next/navigation";
import { NavBar } from "@/app/calculator/_components/NavBar";
import { listMasterPapers } from "@/lib/paper-rm";
import AdminBoxCalculator from "./AdminBoxCalculator";

export default async function AdminBoxPage() {
  const session = getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/calculator/client/box");

  let papers = [];
  try { papers = await listMasterPapers(); } catch { /* Paper RM env may be unset — falls back to manual entry */ }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <NavBar role="admin" />
      <div className="max-w-6xl mx-auto px-4 pb-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-1 dark:text-white">Custom Box Calculator</h1>
        <p className="text-sm text-gray-500 mb-6 dark:text-gray-400">Internal box pricing with full cost breakdown. Save quotes for future reference.</p>
        <AdminBoxCalculator papers={papers} />
      </div>
    </div>
  );
}
