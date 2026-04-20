import { redirect } from "next/navigation";
import { getSession } from "@/lib/orders/session";
import { listJobsForSession, listClients } from "@/lib/orders/repo";
import { ROLES } from "@/lib/orders/constants";
import NavBar from "@/app/orders/_components/NavBar";
import CustomerJobsView from "./CustomerJobsView";

export const dynamic = "force-dynamic";

export default async function CustomerPage() {
  const s = getSession();
  if (!s) redirect("/orders/login");
  if (s.role !== ROLES.CUSTOMER) redirect("/orders");

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
