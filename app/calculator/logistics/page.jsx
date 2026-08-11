import { redirect } from "next/navigation";
import { getSession } from "@/lib/hub/session";
import { canUseLogistics, loadBootstrap } from "@/lib/logistics/repo";
import LogisticsCalc from "./LogisticsCalc";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Logistics Calculator — Aeros",
  description:
    "Domestic shipment cost via Delhivery B2B — item + qty from the master catalogue, vendor origin, saved delivery addresses, contract-exact freight breakdown.",
};

export default async function LogisticsPage() {
  const session = getSession();
  if (!session) redirect("/login");
  if (!canUseLogistics(session)) redirect("/calculator");

  let data = null;
  let error = null;
  try {
    data = await loadBootstrap();
  } catch (e) {
    error = e?.message || "Failed to load rate data";
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 pt-6 pb-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-1 dark:text-white">Logistics Rate Calculator</h1>
      <p className="text-sm text-gray-500 mb-6 dark:text-gray-400">
        Domestic B2B shipments via Delhivery — contract rates from the Jan-2026 addendum. Internal cost tool.
      </p>
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          <p className="font-semibold">Could not load rate data.</p>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      ) : (
        <LogisticsCalc initialData={data} />
      )}
    </div>
  );
}
