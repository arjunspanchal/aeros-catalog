import { redirect } from "next/navigation";
import { getSession } from "@/lib/factoryos/session";
import { listJobsForSession, listClients } from "@/lib/factoryos/repo";
import { ROLES } from "@/lib/factoryos/constants";
import NavBar from "@/app/factoryos/_components/NavBar";
import CustomerJobsView from "./CustomerJobsView";

export const dynamic = "force-dynamic";

export default async function CustomerPage() {
  const s = getSession();
  if (!s) redirect("/login");
  if (s.role !== ROLES.CUSTOMER) redirect("/factoryos");

  const [jobs, clients] = await Promise.all([listJobsForSession(s), listClients()]);
  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c]));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <NavBar role={s.role} name={s.name} email={s.email} />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CustomerJobsView jobs={jobs} clientMap={clientMap} />
      </main>
    </div>
  );
}
