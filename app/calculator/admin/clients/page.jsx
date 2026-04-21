import { getSession } from "@/lib/calc/session";
import { redirect } from "next/navigation";
import { NavBar } from "@/app/calculator/_components/NavBar";
import ClientsAdmin from "./ClientsAdmin";

export default function AdminClientsPage() {
  const session = getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/calculator/client");
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <NavBar role="admin" />
      <div className="max-w-5xl mx-auto px-4 pb-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-1 dark:text-white">Clients</h1>
        <p className="text-sm text-gray-500 mb-6 dark:text-gray-400">Registered client accounts. Margin % is what each client sees added to manufacturing cost.</p>
        <ClientsAdmin />
      </div>
    </div>
  );
}
