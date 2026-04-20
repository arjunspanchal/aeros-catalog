import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/orders/session";
import { listJobsForSession, listClients, listUsers } from "@/lib/orders/repo";
import { ROLES, STAGES } from "@/lib/orders/constants";
import NavBar from "@/app/orders/_components/NavBar";
import StatusChart from "@/app/orders/_components/StatusChart";
import { StageBadge, formatDate } from "@/app/orders/_components/ui";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const s = getSession();
  if (!s) redirect("/orders/login");
  if (s.role !== ROLES.ADMIN) redirect("/orders");

  const [jobs, clients, users] = await Promise.all([
    listJobsForSession(s),
    listClients(),
    listUsers(),
  ]);
  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c]));

  const stageCount = Object.fromEntries(STAGES.map((st) => [st, 0]));
  for (const j of jobs) if (stageCount[j.stage] !== undefined) stageCount[j.stage]++;

  const recent = jobs.slice(0, 10);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <NavBar role={s.role} name={s.name} email={s.email} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin</h1>
            <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">
              {jobs.length} jobs · {clients.length} clients · {users.length} users
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link href="/orders/admin/clients" className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:border-gray-300 dark:bg-gray-900 dark:border-gray-800">Clients</Link>
            <Link href="/orders/admin/users" className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:border-gray-300 dark:bg-gray-900 dark:border-gray-800">Users</Link>
            <Link href="/orders/manager/pos" className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:border-gray-300 dark:bg-gray-900 dark:border-gray-800">Customer POs</Link>
            <Link href="/orders/admin/jobs/new" className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ New job</Link>
          </div>
        </div>

        <div className="mb-6">
          <StatusChart jobs={jobs} title="Jobs by stage" />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden dark:bg-gray-900 dark:border-gray-800">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Recent jobs</h2>
            <Link href="/orders/manager" className="text-xs text-blue-600 hover:underline dark:text-blue-400">View all →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase dark:bg-gray-800/50 dark:text-gray-400">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">J#</th>
                  <th className="text-left px-4 py-2 font-medium">Client / Brand</th>
                  <th className="text-left px-4 py-2 font-medium">Item</th>
                  <th className="text-right px-4 py-2 font-medium">Qty</th>
                  <th className="text-left px-4 py-2 font-medium">Stage</th>
                  <th className="text-left px-4 py-2 font-medium">Dispatch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {recent.map((j) => (
                  <tr key={j.id}>
                    <td className="px-4 py-2 font-mono text-xs">
                      <Link href={`/orders/admin/jobs/${j.id}`} className="text-blue-600 hover:underline dark:text-blue-400">{j.jNumber}</Link>
                    </td>
                    <td className="px-4 py-2">
                      <div className="text-gray-900 dark:text-white">{j.clientIds.map((c) => clientMap[c]?.name).filter(Boolean).join(", ") || "—"}</div>
                      {j.brand && <div className="text-xs text-gray-500 dark:text-gray-400">{j.brand}</div>}
                    </td>
                    <td className="px-4 py-2 text-gray-900 dark:text-white">{j.item}</td>
                    <td className="px-4 py-2 text-right text-gray-900 dark:text-white">
                      {j.qty != null ? j.qty.toLocaleString("en-IN") : "—"}
                    </td>
                    <td className="px-4 py-2"><StageBadge stage={j.stage} /></td>
                    <td className="px-4 py-2 text-xs text-gray-600 dark:text-gray-300">{formatDate(j.expectedDispatchDate)}</td>
                  </tr>
                ))}
                {recent.length === 0 && <tr><td colSpan={6} className="text-center text-sm text-gray-500 py-8 dark:text-gray-400">No jobs yet. Create one to get started.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

function Card({ label, value }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 dark:bg-gray-900 dark:border-gray-800">
      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</div>
      <div className="text-lg font-bold text-gray-900 dark:text-white">{value}</div>
    </div>
  );
}
