import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/orders/session";
import { getJob, listJobUpdates } from "@/lib/orders/repo";
import { ROLES } from "@/lib/orders/constants";
import NavBar from "@/app/orders/_components/NavBar";
import { StageBadge, StageTimeline, formatDate, formatDateTime } from "@/app/orders/_components/ui";

export const dynamic = "force-dynamic";

export default async function CustomerJobDetail({ params }) {
  const s = getSession();
  if (!s) redirect("/orders/login");
  if (s.role !== ROLES.CUSTOMER) redirect("/orders");

  const job = await getJob(params.id);
  if (!job) notFound();
  const myClients = new Set(s.clientIds || []);
  if (!job.clientIds.some((c) => myClients.has(c))) redirect("/orders/customer");

  const updates = await listJobUpdates(job.id);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <NavBar role={s.role} name={s.name} email={s.email} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/orders/customer" className="text-xs text-gray-500 hover:text-blue-700 dark:text-gray-400 dark:hover:text-blue-400">
          ← All orders
        </Link>

        <div className="mt-4 bg-white border border-gray-200 rounded-xl p-5 dark:bg-gray-900 dark:border-gray-800">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{job.item}</h1>
              <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">
                J# {job.jNumber}{job.brand && <> · {job.brand}</>}{job.city && <> · {job.city}</>}
              </p>
            </div>
            <StageBadge stage={job.stage} />
          </div>

          <div className="mt-5">
            <StageTimeline stage={job.stage} />
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Current: {job.stage}</span>
              {job.expectedDispatchDate && <span>Dispatch by {formatDate(job.expectedDispatchDate)}</span>}
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {job.qty != null && <>
              <dt className="text-gray-500 dark:text-gray-400">Quantity</dt>
              <dd className="text-gray-900 dark:text-white">{job.qty.toLocaleString("en-IN")} pcs</dd>
            </>}
            {job.category && <>
              <dt className="text-gray-500 dark:text-gray-400">Category</dt>
              <dd className="text-gray-900 dark:text-white">{job.category}</dd>
            </>}
            {job.poNumber && <>
              <dt className="text-gray-500 dark:text-gray-400">PO number</dt>
              <dd className="text-gray-900 dark:text-white">{job.poNumber}</dd>
            </>}
            {job.orderDate && <>
              <dt className="text-gray-500 dark:text-gray-400">Order date</dt>
              <dd className="text-gray-900 dark:text-white">{formatDate(job.orderDate)}</dd>
            </>}
          </dl>

          {job.notes && (
            <div className="mt-5 rounded-lg bg-blue-50 border border-blue-100 p-3 text-sm text-blue-900 dark:bg-blue-950/40 dark:border-blue-900 dark:text-blue-100">
              {job.notes}
            </div>
          )}
        </div>

        <div className="mt-6 bg-white border border-gray-200 rounded-xl p-5 dark:bg-gray-900 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Timeline</h2>
          {updates.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">No updates yet.</p>
          )}
          <ol className="space-y-3">
            {updates.map((u) => (
              <li key={u.id} className="flex items-start gap-3">
                <div className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <StageBadge stage={u.stage} />
                    <span className="text-xs text-gray-500 dark:text-gray-400">{formatDateTime(u.createdAt)}</span>
                  </div>
                  {u.note && <p className="text-sm text-gray-700 mt-1 dark:text-gray-300">{u.note}</p>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </main>
    </div>
  );
}
