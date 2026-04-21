import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/orders/session";
import { listRuns, listMachines, listJobsForSession } from "@/lib/orders/repo";
import { ROLES } from "@/lib/orders/constants";
import NavBar from "@/app/orders/_components/NavBar";
import RunsAdmin from "./RunsAdmin";

export const dynamic = "force-dynamic";

export default async function AdminRunsPage() {
  const s = getSession();
  if (!s) redirect("/orders/login");
  if (s.role !== ROLES.ADMIN && s.role !== ROLES.FACTORY_MANAGER) redirect("/orders");
  const [runs, machines, jobs] = await Promise.all([
    listRuns({ limit: 200 }),
    listMachines(),
    listJobsForSession(s).catch(() => []),
  ]);
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <NavBar role={s.role} name={s.name} email={s.email} />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/orders/admin" className="text-xs text-gray-500 hover:text-blue-700 dark:text-gray-400 dark:hover:text-blue-400">← Admin</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-4 dark:text-white">Production runs</h1>
        <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">
          Each run = one shift / batch on a machine. Log RM consumed (kgs) and output produced (pcs). Consumption automatically decrements RM Inventory.
        </p>
        <RunsAdmin initialRuns={runs} machines={machines} jobs={jobs} currentUser={{ email: s.email, name: s.name }} />
      </main>
    </div>
  );
}
