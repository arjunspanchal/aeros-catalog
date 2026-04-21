import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/factoryos/session";
import {
  getRun,
  getMachine,
  getJob,
  listConsumptionForRun,
  listRawMaterials,
} from "@/lib/factoryos/repo";
import { ROLES } from "@/lib/factoryos/constants";
import NavBar from "@/app/factoryos/_components/NavBar";
import RunDetail from "./RunDetail";

export const dynamic = "force-dynamic";

export default async function AdminRunDetailPage({ params }) {
  const s = getSession();
  if (!s) redirect("/login");
  if (s.role !== ROLES.ADMIN && s.role !== ROLES.FACTORY_MANAGER) redirect("/factoryos");

  const run = await getRun(params.id);
  if (!run) notFound();

  const [machine, job, consumption, inventory] = await Promise.all([
    run.machineId ? getMachine(run.machineId) : null,
    run.jobId ? getJob(run.jobId) : null,
    listConsumptionForRun(run.id),
    listRawMaterials(),
  ]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <NavBar role={s.role} name={s.name} email={s.email} />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/factoryos/admin/runs" className="text-xs text-gray-500 hover:text-blue-700 dark:text-gray-400 dark:hover:text-blue-400">← Runs</Link>
        <RunDetail
          initialRun={run}
          machine={machine}
          job={job}
          initialConsumption={consumption}
          inventory={inventory}
        />
      </main>
    </div>
  );
}
