import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/orders/session";
import { listClients } from "@/lib/orders/repo";
import { ROLES } from "@/lib/orders/constants";
import NavBar from "@/app/orders/_components/NavBar";
import ClientsAdmin from "./ClientsAdmin";

export const dynamic = "force-dynamic";

export default async function AdminClientsPage() {
  const s = getSession();
  if (!s) redirect("/orders/login");
  if (s.role !== ROLES.ADMIN) redirect("/orders");
  const clients = await listClients();
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <NavBar role={s.role} name={s.name} email={s.email} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/orders/admin" className="text-xs text-gray-500 hover:text-blue-700 dark:text-gray-400 dark:hover:text-blue-400">← Admin</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-4 dark:text-white">Clients</h1>
        <ClientsAdmin initialClients={clients} />
      </main>
    </div>
  );
}
