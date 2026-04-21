import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/factoryos/session";
import { listUsers, listClients } from "@/lib/factoryos/repo";
import { ROLES } from "@/lib/factoryos/constants";
import NavBar from "@/app/factoryos/_components/NavBar";
import UsersAdmin from "./UsersAdmin";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const s = getSession();
  if (!s) redirect("/login");
  if (s.role !== ROLES.ADMIN && s.role !== ROLES.FACTORY_MANAGER) redirect("/factoryos");
  const [users, clients] = await Promise.all([listUsers(), listClients()]);
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <NavBar role={s.role} name={s.name} email={s.email} />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/factoryos/admin" className="text-xs text-gray-500 hover:text-blue-700 dark:text-gray-400 dark:hover:text-blue-400">← Admin</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-4 dark:text-white">Users</h1>
        <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">Customers, account managers, and the factory manager. Admin login uses a password, not a user row.</p>
        <UsersAdmin initialUsers={users} clients={clients} />
      </main>
    </div>
  );
}
