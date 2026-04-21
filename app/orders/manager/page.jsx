import { redirect } from "next/navigation";
import { getSession } from "@/lib/orders/session";
import { listJobsForSession, listClients, listUsers } from "@/lib/orders/repo";
import { ROLES } from "@/lib/orders/constants";
import NavBar from "@/app/orders/_components/NavBar";
import ManagerJobsView from "./ManagerJobsView";

export const dynamic = "force-dynamic";

export default async function ManagerPage() {
  const s = getSession();
  if (!s) redirect("/login");
  if (s.role === ROLES.CUSTOMER) redirect("/orders/customer");

  const [jobs, clients, users] = await Promise.all([
    listJobsForSession(s),
    listClients(),
    s.role === ROLES.FACTORY_MANAGER || s.role === ROLES.ADMIN ? listUsers() : Promise.resolve([]),
  ]);
  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c]));
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <NavBar role={s.role} name={s.name} email={s.email} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ManagerJobsView jobs={jobs} clientMap={clientMap} userMap={userMap} role={s.role} />
      </main>
    </div>
  );
}
