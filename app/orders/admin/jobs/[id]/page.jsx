import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/orders/session";
import { getJob, listJobUpdates, listClients } from "@/lib/orders/repo";
import { ROLES } from "@/lib/orders/constants";
import NavBar from "@/app/orders/_components/NavBar";
import JobEditor from "@/app/orders/manager/[id]/JobEditor";

export const dynamic = "force-dynamic";

export default async function AdminJobDetail({ params }) {
  const s = getSession();
  if (!s) redirect("/orders/login");
  if (s.role !== ROLES.ADMIN && s.role !== ROLES.FACTORY_MANAGER) redirect("/orders");
  const job = await getJob(params.id);
  if (!job) notFound();
  const [updates, clients] = await Promise.all([listJobUpdates(job.id), listClients()]);
  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c]));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <NavBar role={s.role} name={s.name} email={s.email} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/orders/admin" className="text-xs text-gray-500 hover:text-blue-700 dark:text-gray-400 dark:hover:text-blue-400">
          ← Back to admin
        </Link>
        <JobEditor job={job} initialUpdates={updates} clientMap={clientMap} role={s.role} />
      </main>
    </div>
  );
}
