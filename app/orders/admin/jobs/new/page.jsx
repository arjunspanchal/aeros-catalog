import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/orders/session";
import { listClients, listUsers } from "@/lib/orders/repo";
import { ROLES } from "@/lib/orders/constants";
import NavBar from "@/app/orders/_components/NavBar";
import NewJobForm from "./NewJobForm";

export const dynamic = "force-dynamic";

export default async function NewJobPage() {
  const s = getSession();
  if (!s) redirect("/orders/login");
  if (s.role !== ROLES.ADMIN) redirect("/orders");
  const [clients, users] = await Promise.all([listClients(), listUsers()]);
  const accountManagers = users.filter((u) => u.role === ROLES.ACCOUNT_MANAGER && u.active);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <NavBar role={s.role} name={s.name} email={s.email} />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/orders/admin" className="text-xs text-gray-500 hover:text-blue-700 dark:text-gray-400 dark:hover:text-blue-400">← Back</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-4 dark:text-white">New job</h1>
        <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">Create a single job (line item). For a multi-item PO, create one job per item and use the same PO number.</p>
        <NewJobForm clients={clients} accountManagers={accountManagers} />
      </main>
    </div>
  );
}
