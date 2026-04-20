import { getSession } from "@/lib/calc/session";
import { redirect } from "next/navigation";
import { NavBar } from "@/app/calculator/_components/NavBar";
import AdminCalculator from "./AdminCalculator";

export default function AdminPage() {
  const session = getSession();
  if (!session) redirect("/calculator/login");
  if (session.role !== "admin") redirect("/calculator/client");
  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar role="admin" />
      <div className="max-w-6xl mx-auto px-4 pb-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Rate Calculator</h1>
        <p className="text-sm text-gray-500 mb-6">Internal pricing calculator with full cost breakdown. Save quotes for future reference.</p>
        <AdminCalculator />
      </div>
    </div>
  );
}
