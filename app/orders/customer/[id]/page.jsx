import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/orders/session";
import { getJob, listJobUpdates } from "@/lib/orders/repo";
import { ROLES } from "@/lib/orders/constants";
import NavBar from "@/app/orders/_components/NavBar";
import CustomerJobDetailClient from "./CustomerJobDetailClient";

export const dynamic = "force-dynamic";

export default async function CustomerJobDetail({ params }) {
  const s = getSession();
  if (!s) redirect("/login");
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
        <CustomerJobDetailClient initialJob={job} initialUpdates={updates} />
      </main>
    </div>
  );
}
